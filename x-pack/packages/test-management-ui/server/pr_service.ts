/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync, execSync } from 'child_process';
import https from 'https';
import type { TestConfig } from '../types';

export interface CIJob {
  id: string;
  name: string;
  state: string;
  exitStatus: number | null;
  webUrl: string;
}

export interface PRInfo {
  number: number;
  title: string;
  state: string;
  url: string;
  branch: string;
  baseBranch: string;
  ciStatus: 'pending' | 'passing' | 'failing' | 'unknown';
  buildkiteUrl?: string;
  buildkiteBuildNumber?: number;
  failedJobs: CIJob[];
  allJobs: CIJob[];
  failedConfigIds: string[];
  /** Failed CI step names extracted from bot comment (e.g. "Quick Checks", "Linting") */
  failedStepNames: string[];
  /** Failed CI steps with Buildkite URLs */
  failedSteps: Array<{ name: string; url: string }>;
}

function exec(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', timeout: 30_000 }).trim();
  } catch {
    return '';
  }
}

function execFile(bin: string, args: string[], cwd: string): string {
  try {
    return execFileSync(bin, args, { cwd, encoding: 'utf-8', timeout: 30_000 }).trim();
  } catch {
    return '';
  }
}

function getCurrentBranch(repoRoot: string): string {
  return exec('git branch --show-current', repoRoot);
}

interface GhPrJson {
  number: number;
  title: string;
  state: string;
  url: string;
  headRefName: string;
  baseRefName: string;
}

interface GhCheck {
  name: string | null;
  status: string | null;
  conclusion: string | null;
  detailsUrl?: string;
}

interface GhComment {
  author: { login: string };
  body: string;
}

function fetchPrMetadata(repoRoot: string): GhPrJson | null {
  const raw = execFile(
    'gh',
    ['pr', 'view', '--json', 'number,title,state,url,headRefName,baseRefName'],
    repoRoot
  );
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GhPrJson;
  } catch {
    return null;
  }
}

function fetchPrChecks(repoRoot: string): GhCheck[] {
  const raw = execFile(
    'gh',
    ['pr', 'view', '--json', 'statusCheckRollup', '--jq', '.statusCheckRollup'],
    repoRoot
  );
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as GhCheck[]).filter((c) => c.name != null);
  } catch {
    return [];
  }
}

function fetchBotComment(repoRoot: string): string | null {
  const raw = execFile(
    'gh',
    ['pr', 'view', '--json', 'comments', '--jq', '.comments'],
    repoRoot
  );
  if (!raw) return null;
  try {
    const comments = JSON.parse(raw) as GhComment[];
    for (let i = comments.length - 1; i >= 0; i--) {
      const c = comments[i];
      if (
        c.body.includes('buildkite-pr-comment-kibana-pull-request') ||
        (c.author.login === 'elasticmachine' && c.body.includes('Buildkite Build'))
      ) {
        return c.body;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

interface BotCommentInfo {
  buildkiteUrl: string | null;
  buildNumber: number | null;
  ciStatus: PRInfo['ciStatus'];
  failedStepNames: string[];
  failedStepUrls: Array<{ name: string; url: string }>;
}

function parseBotComment(body: string): BotCommentInfo {
  const result: BotCommentInfo = {
    buildkiteUrl: null,
    buildNumber: null,
    ciStatus: 'unknown',
    failedStepNames: [],
    failedStepUrls: [],
  };

  // Extract Buildkite URL from markdown link
  const bkMatch = body.match(
    /\[Buildkite Build\]\((https:\/\/buildkite\.com\/elastic\/kibana-pull-request\/builds\/(\d+))\)/
  );
  if (bkMatch) {
    result.buildkiteUrl = bkMatch[1];
    result.buildNumber = parseInt(bkMatch[2], 10);
  }

  // Determine CI status from the heading
  if (body.includes('Build in-progress, with failures') || body.includes('Build failed')) {
    result.ciStatus = 'failing';
  } else if (body.includes('Build succeeded')) {
    result.ciStatus = 'passing';
  } else if (body.includes('Build in-progress')) {
    result.ciStatus = 'pending';
  }

  // Also try the embedded JSON metadata
  const jsonMatch = body.match(
    /<!--buildkite-pr-comment-kibana-pull-request\s*(\{[\s\S]*?\})\s*buildkite-pr-comment-->/
  );
  if (jsonMatch) {
    try {
      const meta = JSON.parse(jsonMatch[1]) as {
        builds?: Array<{
          buildStatus?: { state?: string; success?: boolean };
          url?: string;
          number?: number;
        }>;
        number?: number;
      };
      const latestBuild = meta.builds?.[0];
      if (latestBuild) {
        if (!result.buildkiteUrl && latestBuild.url) {
          result.buildkiteUrl = latestBuild.url;
        }
        if (!result.buildNumber && latestBuild.number) {
          result.buildNumber = latestBuild.number;
        }
        if (result.ciStatus === 'unknown') {
          if (latestBuild.buildStatus?.state === 'failing') result.ciStatus = 'failing';
          else if (latestBuild.buildStatus?.success) result.ciStatus = 'passing';
          else result.ciStatus = 'pending';
        }
      }
    } catch {
      // ignore
    }
  }

  // Extract failed CI step names and URLs
  const failedSection = body.match(
    /### Failed CI Steps\s*\n([\s\S]*?)(?=\n###|\n<!--|$)/
  );
  if (failedSection) {
    const stepRe = /\*\s*\[([^\]]+)\]\(([^)]+)\)/g;
    let m;
    while ((m = stepRe.exec(failedSection[1])) !== null) {
      result.failedStepNames.push(m[1]);
      result.failedStepUrls.push({ name: m[1], url: m[2] });
    }
  }

  return result;
}

function parseBuildkiteUrl(checks: GhCheck[]): { url: string; buildNumber: number } | null {
  for (const check of checks) {
    if (check.name === 'kibana-ci' && check.detailsUrl) {
      const match = check.detailsUrl.match(/builds\/(\d+)/);
      if (match) {
        return { url: check.detailsUrl, buildNumber: parseInt(match[1], 10) };
      }
    }
  }

  const raw = checks.find(
    (c) =>
      c.name?.includes('kibana-ci') ||
      c.name?.includes('kibana-pull-request')
  );
  if (raw?.detailsUrl) {
    const match = raw.detailsUrl.match(/builds\/(\d+)/);
    if (match) {
      return { url: raw.detailsUrl, buildNumber: parseInt(match[1], 10) };
    }
  }
  return null;
}

function deriveCiStatus(checks: GhCheck[]): PRInfo['ciStatus'] {
  if (checks.length === 0) return 'unknown';

  const hasFailure = checks.some(
    (c) => c.conclusion === 'FAILURE' || c.conclusion === 'ERROR'
  );
  if (hasFailure) return 'failing';

  const hasPending = checks.some(
    (c) => c.status === 'IN_PROGRESS' || c.status === 'QUEUED' || c.status === 'PENDING'
  );
  if (hasPending) return 'pending';

  return 'passing';
}

function httpGetJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body) as T);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15_000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

interface BkJob {
  id: string;
  name: string;
  state: string;
  exit_status: number | null;
  web_url: string;
}

interface BkBuild {
  jobs: BkJob[];
}

export async function fetchBuildkiteJobLog(
  buildNumber: number,
  jobId: string
): Promise<string> {
  const token = process.env.BUILDKITE_API_TOKEN;
  if (!token) return 'BUILDKITE_API_TOKEN not set — cannot fetch CI logs.';

  try {
    const url = `https://api.buildkite.com/v2/organizations/elastic/pipelines/kibana-pull-request/builds/${buildNumber}/jobs/${jobId}/log`;
    const data = await httpGetJson<{ content: string }>(url, {
      Authorization: `Bearer ${token}`,
    });
    return data.content ?? '';
  } catch {
    return 'Failed to fetch Buildkite job log.';
  }
}

async function fetchBuildkiteJobs(buildNumber: number): Promise<CIJob[]> {
  const token = process.env.BUILDKITE_API_TOKEN;
  if (!token) return [];

  try {
    const data = await httpGetJson<BkBuild>(
      `https://api.buildkite.com/v2/organizations/elastic/pipelines/kibana-pull-request/builds/${buildNumber}`,
      { Authorization: `Bearer ${token}` }
    );

    return (data.jobs ?? [])
      .filter((j) => j.name)
      .map((j) => ({
        id: j.id,
        name: j.name,
        state: j.state,
        exitStatus: j.exit_status,
        webUrl: j.web_url,
      }));
  } catch {
    return [];
  }
}

/**
 * Map failed Buildkite job names to discovered config IDs.
 */
function mapJobsToConfigs(jobs: CIJob[], allConfigs: TestConfig[]): string[] {
  const configIds = new Set<string>();

  const failedJobs = jobs.filter(
    (j) => j.state === 'failed' || (j.exitStatus != null && j.exitStatus !== 0)
  );

  for (const job of failedJobs) {
    const name = job.name.toLowerCase();

    for (const config of allConfigs) {
      const relPath = config.relativePath.toLowerCase();

      if (name.includes(relPath)) {
        configIds.add(config.id);
        continue;
      }

      const parts = relPath.split('/');
      const configFileName = parts[parts.length - 1];
      const dirPath = parts.slice(0, -1).join('/');
      if (name.includes(dirPath) && name.includes(configFileName)) {
        configIds.add(config.id);
      }
    }
  }

  return [...configIds];
}

/**
 * Map failed CI step names (from bot comment) to CI check config IDs.
 * Uses fuzzy matching: "Quick Checks" matches a ci-check config named "Quick Checks".
 */
function mapStepNamesToConfigs(stepNames: string[], allConfigs: TestConfig[]): string[] {
  const ciChecks = allConfigs.filter((c) => c.type === 'ci-check');
  const ids = new Set<string>();

  for (const stepName of stepNames) {
    const lower = stepName.toLowerCase();
    for (const check of ciChecks) {
      if (check.name.toLowerCase() === lower) {
        ids.add(check.id);
        continue;
      }
      // Fuzzy: "Check Types" matches "Check Types", "Linting" matches any linting variant
      if (
        check.name.toLowerCase().includes(lower) ||
        lower.includes(check.name.toLowerCase())
      ) {
        ids.add(check.id);
      }
    }
  }

  return [...ids];
}

export class PRService {
  private repoRoot: string;
  private cachedInfo: PRInfo | null = null;
  private lastFetchTime = 0;
  private fetchingPromise: Promise<PRInfo | null> | null = null;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }

  async getInfo(allConfigs: TestConfig[] = []): Promise<PRInfo | null> {
    const now = Date.now();
    if (this.cachedInfo && now - this.lastFetchTime < 30_000) {
      if (allConfigs.length > 0) {
        this.remapFailedConfigs(allConfigs);
      }
      return this.cachedInfo;
    }

    if (this.fetchingPromise) return this.fetchingPromise;

    this.fetchingPromise = this.fetchFresh(allConfigs);
    try {
      const result = await this.fetchingPromise;
      return result;
    } finally {
      this.fetchingPromise = null;
    }
  }

  private remapFailedConfigs(allConfigs: TestConfig[]): void {
    if (!this.cachedInfo) return;

    const fromJobs =
      this.cachedInfo.failedJobs.length > 0
        ? mapJobsToConfigs(this.cachedInfo.failedJobs, allConfigs)
        : [];
    const fromSteps =
      this.cachedInfo.failedStepNames.length > 0
        ? mapStepNamesToConfigs(this.cachedInfo.failedStepNames, allConfigs)
        : [];

    this.cachedInfo.failedConfigIds = [...new Set([...fromJobs, ...fromSteps])];
  }

  private async fetchFresh(allConfigs: TestConfig[]): Promise<PRInfo | null> {
    const branch = getCurrentBranch(this.repoRoot);
    if (!branch || branch === 'main' || branch === 'master') return null;

    const prData = fetchPrMetadata(this.repoRoot);
    if (!prData) return null;

    // Fetch GitHub checks (some repos have CI status here)
    const checks = fetchPrChecks(this.repoRoot);
    let ciStatus = deriveCiStatus(checks);
    let bkInfo = parseBuildkiteUrl(checks);

    // Parse the elasticmachine bot comment — primary source for Kibana CI
    const botBody = fetchBotComment(this.repoRoot);
    let failedStepNames: string[] = [];
    let failedSteps: Array<{ name: string; url: string }> = [];

    if (botBody) {
      const botInfo = parseBotComment(botBody);

      // Bot comment is authoritative for Kibana CI
      if (botInfo.ciStatus !== 'unknown') {
        ciStatus = botInfo.ciStatus;
      }
      if (botInfo.buildkiteUrl && botInfo.buildNumber) {
        bkInfo = { url: botInfo.buildkiteUrl, buildNumber: botInfo.buildNumber };
      }
      failedStepNames = botInfo.failedStepNames;
      failedSteps = botInfo.failedStepUrls;
    }

    let allJobs: CIJob[] = [];
    let failedJobs: CIJob[] = [];

    if (bkInfo) {
      allJobs = await fetchBuildkiteJobs(bkInfo.buildNumber);
      failedJobs = allJobs.filter(
        (j) => j.state === 'failed' || (j.exitStatus != null && j.exitStatus !== 0)
      );
    }

    const fromJobs =
      allConfigs.length > 0 && failedJobs.length > 0
        ? mapJobsToConfigs(failedJobs, allConfigs)
        : [];
    const fromSteps =
      allConfigs.length > 0 && failedStepNames.length > 0
        ? mapStepNamesToConfigs(failedStepNames, allConfigs)
        : [];

    const info: PRInfo = {
      number: prData.number,
      title: prData.title,
      state: prData.state,
      url: prData.url,
      branch,
      baseBranch: prData.baseRefName,
      ciStatus,
      buildkiteUrl: bkInfo?.url,
      buildkiteBuildNumber: bkInfo?.buildNumber,
      failedJobs,
      allJobs,
      failedConfigIds: [...new Set([...fromJobs, ...fromSteps])],
      failedStepNames,
      failedSteps,
    };

    this.cachedInfo = info;
    this.lastFetchTime = Date.now();
    return info;
  }

  invalidate(): void {
    this.cachedInfo = null;
    this.lastFetchTime = 0;
  }
}
