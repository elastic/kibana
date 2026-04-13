/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import path from 'path';
import fs from 'fs';
import {
  discoverJestConfigs,
  discoverJestIntegrationConfigs,
  discoverScoutConfigs,
  discoverFtrConfigs,
  getCIChecks,
  buildTestFileCountMaps,
  assignTestCounts,
  searchTestFiles,
} from './config_discovery';
import { TestRunner } from './test_runner';
import { ServerManager } from './server_manager';
import { PRService, fetchBuildkiteJobLog } from './pr_service';
import { ChangedFilesService } from './changed_files_service';
import type { DiscoveredConfigs, TestConfig, TestRunEvent } from '../types';

interface ServerOptions {
  port: number;
  repoRoot: string;
}

function jsonResponse(res: http.ServerResponse, data: unknown, statusCode = 200): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export function startServer(options: ServerOptions): http.Server {
  const { port, repoRoot } = options;
  const testRunner = new TestRunner(repoRoot);
  const serverManager = new ServerManager(repoRoot);
  const prService = new PRService(repoRoot);
  const changedFilesService = new ChangedFilesService(repoRoot);
  let configs: DiscoveredConfigs = {
    jest: [],
    jestIntegration: [],
    scout: [],
    ftr: [],
    ciChecks: [],
    totalCount: 0,
    discoveredAt: '',
    discoveryStatus: 'idle',
  };
  let discoveryRunning = false;

  function updateConfigTotals(): void {
    configs.totalCount =
      configs.jest.length +
      configs.jestIntegration.length +
      configs.scout.length +
      configs.ftr.length +
      configs.ciChecks.length;
  }

  function broadcastConfigs(phase: string): void {
    configs.discoveryPhase = phase;
    configs.discoveredAt = new Date().toISOString();
    updateConfigTotals();
    const data = `data: ${JSON.stringify({ type: 'config-update', configs })}\n\n`;
    for (const client of sseClients) {
      client.write(data);
    }
  }

  function runDiscoveryAsync(): void {
    if (discoveryRunning) return;
    discoveryRunning = true;
    configs.discoveryStatus = 'discovering';

    const phases: Array<{ key: string; run: () => void }> = [
      {
        key: 'ci-checks',
        run: () => {
          configs.ciChecks = getCIChecks(repoRoot);
        },
      },
      {
        key: 'jest',
        run: () => {
          configs.jest = discoverJestConfigs(repoRoot);
        },
      },
      {
        key: 'jest-integration',
        run: () => {
          configs.jestIntegration = discoverJestIntegrationConfigs(repoRoot);
        },
      },
      {
        key: 'scout',
        run: () => {
          configs.scout = discoverScoutConfigs(repoRoot);
        },
      },
      {
        key: 'ftr',
        run: () => {
          configs.ftr = discoverFtrConfigs(repoRoot);
        },
      },
      {
        key: 'counting test files',
        run: () => {
          const maps = buildTestFileCountMaps(repoRoot);
          assignTestCounts(configs.jest, maps.unit);
          assignTestCounts(configs.jestIntegration, maps.integration);
          assignTestCounts(configs.scout, maps.all);
          assignTestCounts(configs.ftr, maps.all);
        },
      },
    ];

    let i = 0;
    const next = (): void => {
      if (i >= phases.length) {
        configs.discoveryStatus = 'complete';
        configs.discoveryPhase = undefined;
        broadcastConfigs('complete');
        discoveryRunning = false;
        return;
      }
      const phase = phases[i++];
      phase.run();
      broadcastConfigs(phase.key);
      setImmediate(next);
    };

    setImmediate(next);
  }

  function findConfig(configId: string): TestConfig | undefined {
    const allConfigs = [
      ...configs.jest,
      ...configs.jestIntegration,
      ...configs.scout,
      ...configs.ftr,
      ...configs.ciChecks,
    ];
    return allConfigs.find((c) => c.id === configId);
  }

  // SSE clients for live streaming
  const sseClients: Set<http.ServerResponse> = new Set();

  testRunner.on('test-event', (event: TestRunEvent) => {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of sseClients) {
      client.write(data);
    }
  });

  serverManager.on('server-status', (event: unknown) => {
    const data = `data: ${JSON.stringify({ type: 'server-status', ...event as Record<string, unknown> })}\n\n`;
    for (const client of sseClients) {
      client.write(data);
    }
  });

  serverManager.on('server-output', (event: unknown) => {
    const data = `data: ${JSON.stringify({ type: 'server-output', ...event as Record<string, unknown> })}\n\n`;
    for (const client of sseClients) {
      client.write(data);
    }
  });

  const uiDir = path.resolve(__dirname, '..', 'ui');

  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.map': 'application/json',
  };

  function serveStaticFile(
    res: http.ServerResponse,
    filePath: string,
    allowedDir: string = uiDir
  ): boolean {
    const resolved = path.resolve(filePath);
    if (
      !resolved.startsWith(allowedDir) ||
      !fs.existsSync(resolved) ||
      !fs.statSync(resolved).isFile()
    ) {
      return false;
    }
    const ext = path.extname(resolved);
    const contentType = mimeTypes[ext] ?? 'application/octet-stream';
    const content = fs.readFileSync(resolved, 'utf-8');
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    return true;
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    const pathname = url.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    try {
      // === UI static files ===
      if (pathname === '/' || pathname === '/index.html') {
        serveStaticFile(res, path.join(uiDir, 'index.html'));
        return;
      }

      if (!pathname.startsWith('/api/') && req.method === 'GET') {
        const filePath = path.join(uiDir, pathname);
        if (serveStaticFile(res, filePath)) {
          return;
        }
      }

      // === SSE stream ===
      if (pathname === '/api/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });
        res.write('data: {"type":"connected"}\n\n');

        // Replay buffered output for all runs so the client has full history
        const replayEvents: Array<{ type: string; runId: string; data: string; timestamp: string }> = [];
        for (const run of testRunner.getAllRuns()) {
          for (const text of run.output) {
            replayEvents.push({ type: 'output', runId: run.id, data: text, timestamp: run.startedAt });
          }
          for (const text of run.errorOutput) {
            replayEvents.push({ type: 'error', runId: run.id, data: text, timestamp: run.startedAt });
          }
        }
        if (replayEvents.length > 0) {
          res.write(`data: ${JSON.stringify({ type: 'replay', events: replayEvents })}\n\n`);
        }

        sseClients.add(res);
        req.on('close', () => sseClients.delete(res));
        return;
      }

      // === Config Discovery ===
      if (pathname === '/api/configs' && req.method === 'GET') {
        if (configs.discoveryStatus === 'idle') {
          runDiscoveryAsync();
        }
        jsonResponse(res, configs);
        return;
      }

      if (pathname === '/api/configs/refresh' && req.method === 'POST') {
        configs = {
          jest: [],
          jestIntegration: [],
          scout: [],
          ftr: [],
          ciChecks: [],
          totalCount: 0,
          discoveredAt: '',
          discoveryStatus: 'idle',
        };
        discoveryRunning = false;
        runDiscoveryAsync();
        jsonResponse(res, configs);
        return;
      }

      if (pathname === '/api/configs/search' && req.method === 'GET') {
        if (configs.discoveryStatus === 'idle') {
          runDiscoveryAsync();
        }
        const query = (url.searchParams.get('q') ?? '').toLowerCase();
        const typeFilter = url.searchParams.get('type');
        let allConfigs = [
          ...configs.jest,
          ...configs.jestIntegration,
          ...configs.scout,
          ...configs.ftr,
        ];
        if (typeFilter) {
          allConfigs = allConfigs.filter((c) => c.type === typeFilter);
        }
        if (query) {
          allConfigs = allConfigs.filter(
            (c) =>
              c.name.toLowerCase().includes(query) ||
              c.relativePath.toLowerCase().includes(query) ||
              (c.ownerPackage ?? '').toLowerCase().includes(query)
          );
        }
        jsonResponse(res, { results: allConfigs, total: allConfigs.length });
        return;
      }

      // === Pull Request ===
      if (pathname === '/api/pr' && req.method === 'GET') {
        const allConfigs = [
          ...configs.jest,
          ...configs.jestIntegration,
          ...configs.scout,
          ...configs.ftr,
          ...configs.ciChecks,
        ];
        const info = await prService.getInfo(allConfigs);
        jsonResponse(res, { pr: info });
        return;
      }

      if (pathname === '/api/pr/refresh' && req.method === 'POST') {
        prService.invalidate();
        const allConfigs = [
          ...configs.jest,
          ...configs.jestIntegration,
          ...configs.scout,
          ...configs.ftr,
          ...configs.ciChecks,
        ];
        const info = await prService.getInfo(allConfigs);
        jsonResponse(res, { pr: info });
        return;
      }

      // === Changed Files ===
      if (pathname === '/api/changed-files' && req.method === 'GET') {
        const allConfigs = [
          ...configs.jest,
          ...configs.jestIntegration,
          ...configs.scout,
          ...configs.ftr,
        ];
        const info = await changedFilesService.getInfo(allConfigs);
        jsonResponse(res, info);
        return;
      }

      if (pathname === '/api/changed-files/refresh' && req.method === 'POST') {
        changedFilesService.invalidate();
        const allConfigs = [
          ...configs.jest,
          ...configs.jestIntegration,
          ...configs.scout,
          ...configs.ftr,
        ];
        const info = await changedFilesService.getInfo(allConfigs);
        jsonResponse(res, info);
        return;
      }

      // === Test File Search ===
      if (pathname === '/api/test-files/search' && req.method === 'GET') {
        const query = url.searchParams.get('q') ?? '';
        if (query.length < 2) {
          jsonResponse(res, { results: [] });
          return;
        }
        const allConfigs = [
          ...configs.jest,
          ...configs.jestIntegration,
        ];
        const results = searchTestFiles(repoRoot, query, allConfigs);
        jsonResponse(res, { results });
        return;
      }

      // === Run Single Test File ===
      if (pathname === '/api/runs/test-file' && req.method === 'POST') {
        const body = await parseBody(req);
        const testFile = body.testFile as string;
        const configId = body.configId as string;
        const config = findConfig(configId);
        if (!config) {
          jsonResponse(res, { error: 'Config not found' }, 404);
          return;
        }
        const runId = testRunner.startRun(config, [testFile]);
        jsonResponse(res, { runId, configId, testFile, status: 'starting' }, 201);
        return;
      }

      // === Buildkite Logs ===
      const bkLogMatch = pathname.match(/^\/api\/buildkite\/builds\/(\d+)\/jobs\/([^/]+)\/log$/);
      if (bkLogMatch && req.method === 'GET') {
        const buildNum = parseInt(bkLogMatch[1], 10);
        const jobId = bkLogMatch[2];
        const log = await fetchBuildkiteJobLog(buildNum, jobId);
        jsonResponse(res, { log });
        return;
      }

      // === Test Runs ===
      if (pathname === '/api/runs' && req.method === 'GET') {
        jsonResponse(res, { runs: testRunner.getAllRuns() });
        return;
      }

      if (pathname === '/api/runs' && req.method === 'POST') {
        const body = await parseBody(req);
        const configId = body.configId as string;
        const extraArgs = (body.extraArgs as string[]) ?? [];
        const repeat = typeof body.repeat === 'number' ? body.repeat : 1;
        const config = findConfig(configId);
        if (!config) {
          jsonResponse(res, { error: 'Config not found' }, 404);
          return;
        }
        if (repeat > 1) {
          const batchId = testRunner.startRepeatedRun(config, repeat, extraArgs);
          jsonResponse(res, { batchId, configId, repeat, status: 'starting' }, 201);
        } else {
          const runId = testRunner.startRun(config, extraArgs);
          jsonResponse(res, { runId, configId, status: 'starting' }, 201);
        }
        return;
      }

      const runMatch = pathname.match(/^\/api\/runs\/([^/]+)$/);
      if (runMatch && req.method === 'GET') {
        const run = testRunner.getRunById(runMatch[1]);
        if (!run) {
          jsonResponse(res, { error: 'Run not found' }, 404);
          return;
        }
        jsonResponse(res, run);
        return;
      }

      const stopMatch = pathname.match(/^\/api\/runs\/([^/]+)\/stop$/);
      if (stopMatch && req.method === 'POST') {
        const stopped = testRunner.stopRun(stopMatch[1]);
        jsonResponse(res, { stopped });
        return;
      }

      // === Server Management ===
      if (pathname === '/api/servers' && req.method === 'GET') {
        jsonResponse(res, { servers: serverManager.getStatus() });
        return;
      }

      if (pathname === '/api/servers/elasticsearch' && req.method === 'POST') {
        const body = await parseBody(req);
        const args = (body.args as string[]) ?? [];
        const status = serverManager.startElasticsearch(args);
        jsonResponse(res, status, 201);
        return;
      }

      if (pathname === '/api/servers/kibana' && req.method === 'POST') {
        const body = await parseBody(req);
        const args = (body.args as string[]) ?? [];
        const status = serverManager.startKibana(args);
        jsonResponse(res, status, 201);
        return;
      }

      const serverStopMatch = pathname.match(/^\/api\/servers\/([^/]+)\/stop$/);
      if (serverStopMatch && req.method === 'POST') {
        const stopped = serverManager.stopServer(serverStopMatch[1]);
        jsonResponse(res, { stopped });
        return;
      }

      if (pathname === '/api/servers/stop-all' && req.method === 'POST') {
        serverManager.stopAll();
        jsonResponse(res, { stopped: true });
        return;
      }

      const serverOutputMatch = pathname.match(/^\/api\/servers\/([^/]+)\/output$/);
      if (serverOutputMatch && req.method === 'GET') {
        const output = serverManager.getServerOutput(serverOutputMatch[1]);
        jsonResponse(res, { output });
        return;
      }

      // 404
      jsonResponse(res, { error: 'Not found' }, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      jsonResponse(res, { error: message }, 500);
    }
  });

  server.listen(port, () => {
    /* eslint-disable no-console */
    console.log(`\n  Test Management UI`);
    console.log(`  ==================`);
    console.log(`  Running at: http://localhost:${port}`);
    console.log(`  Repo root:  ${repoRoot}`);
    console.log(`  Press Ctrl+C to stop\n`);
    /* eslint-enable no-console */
  });

  // Graceful shutdown
  const shutdown = () => {
    /* eslint-disable no-console */
    console.log('\nShutting down...');
    /* eslint-enable no-console */
    testRunner.destroy();
    serverManager.stopAll();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}
