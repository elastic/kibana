/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exec as execCb } from 'child_process';
import path from 'path';
import type { TestConfig } from '../types';

function execAsync(cmd: string, cwd: string): Promise<string> {
  return new Promise((resolve) => {
    execCb(cmd, { cwd, encoding: 'utf-8', timeout: 30_000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      resolve(err ? '' : (stdout ?? '').trim());
    });
  });
}

export interface ChangedFilesInfo {
  baseBranch: string;
  changedFiles: string[];
  affectedConfigIds: string[];
  affectedTsProjects: string[];
  changedLintableFiles: string[];
}

export class ChangedFilesService {
  private repoRoot: string;
  private cached: ChangedFilesInfo | null = null;
  private lastFetchTime = 0;
  private fetchPromise: Promise<ChangedFilesInfo> | null = null;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }

  async getInfo(allConfigs: TestConfig[] = []): Promise<ChangedFilesInfo> {
    const now = Date.now();
    if (this.cached && now - this.lastFetchTime < 15_000) {
      if (allConfigs.length > 0) {
        this.cached.affectedConfigIds = this.mapToConfigs(this.cached.changedFiles, allConfigs);
      }
      return this.cached;
    }

    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = this.fetchFresh(allConfigs);
    try {
      return await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  invalidate(): void {
    this.cached = null;
    this.lastFetchTime = 0;
  }

  private async fetchFresh(allConfigs: TestConfig[]): Promise<ChangedFilesInfo> {
    const baseBranch = await this.detectBaseBranch();
    const changedFiles = await this.getChangedFiles(baseBranch);
    const changedLintableFiles = changedFiles.filter(
      (f) => /\.(ts|tsx|js|jsx)$/.test(f) && !f.includes('node_modules')
    );
    const affectedTsProjects = await this.findAffectedTsProjects(changedFiles);
    const affectedConfigIds =
      allConfigs.length > 0 ? this.mapToConfigs(changedFiles, allConfigs) : [];

    this.cached = {
      baseBranch,
      changedFiles,
      affectedConfigIds,
      affectedTsProjects,
      changedLintableFiles,
    };
    this.lastFetchTime = Date.now();
    return this.cached;
  }

  private async detectBaseBranch(): Promise<string> {
    const upstream = await execAsync(
      'git rev-parse --abbrev-ref @{upstream} 2>/dev/null',
      this.repoRoot
    );
    if (upstream) {
      const remote = upstream.split('/')[0] ?? 'origin';
      return `${remote}/main`;
    }
    return 'origin/main';
  }

  private async getChangedFiles(baseBranch: string): Promise<string[]> {
    const mergeBase = await execAsync(`git merge-base ${baseBranch} HEAD`, this.repoRoot);
    const base = mergeBase || baseBranch;
    const raw = await execAsync(`git diff --name-only ${base}...HEAD`, this.repoRoot);
    if (!raw) return [];
    return raw.split('\n').filter(Boolean);
  }

  private mapToConfigs(changedFiles: string[], allConfigs: TestConfig[]): string[] {
    const changedDirs = new Set<string>();
    for (const f of changedFiles) {
      let dir = path.dirname(f);
      while (dir && dir !== '.') {
        changedDirs.add(dir);
        dir = path.dirname(dir);
      }
    }

    const affected = new Set<string>();
    for (const config of allConfigs) {
      if (config.type === 'ci-check') continue;
      const configDir = path.dirname(config.relativePath);
      if (changedDirs.has(configDir)) {
        affected.add(config.id);
      }
    }
    return [...affected];
  }

  /**
   * Find tsconfig.json projects affected by changed files.
   * Uses a single git ls-files call then matches in-memory.
   */
  private async findAffectedTsProjects(changedFiles: string[]): Promise<string[]> {
    const tsFiles = changedFiles.filter((f) => /\.tsx?$/.test(f));
    if (tsFiles.length === 0) return [];

    const raw = await execAsync(
      'git ls-files --cached --others --exclude-standard "**/tsconfig.json"',
      this.repoRoot
    );
    if (!raw) return [];

    const allTsconfigs = raw
      .split('\n')
      .filter((f) => f && !f.includes('node_modules') && !f.includes('target/'));

    const tsconfigDirMap = new Map<string, string>();
    for (const tc of allTsconfigs) {
      tsconfigDirMap.set(path.dirname(tc), tc);
    }

    const projects = new Set<string>();
    for (const file of tsFiles) {
      let dir = path.dirname(file);
      while (dir && dir !== '.') {
        const tc = tsconfigDirMap.get(dir);
        if (tc) {
          projects.add(tc);
          break;
        }
        dir = path.dirname(dir);
      }
    }

    return [...projects];
  }
}
