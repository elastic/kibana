/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type { ServerStatus } from '../types';

interface ManagedServer {
  process: ChildProcess;
  status: ServerStatus;
  output: string[];
  startedAt: number;
}

/**
 * Manages Elasticsearch and Kibana dev server processes
 * for running FTR and Scout tests.
 */
export class ServerManager extends EventEmitter {
  private readonly repoRoot: string;
  private readonly servers: Map<string, ManagedServer> = new Map();

  constructor(repoRoot: string) {
    super();
    this.repoRoot = repoRoot;
  }

  getStatus(): ServerStatus[] {
    return [...this.servers.values()].map((s) => ({
      ...s.status,
      uptime: s.status.status === 'running' ? Date.now() - s.startedAt : undefined,
    }));
  }

  getServerOutput(name: string): string[] {
    return this.servers.get(name)?.output ?? [];
  }

  startElasticsearch(args: string[] = []): ServerStatus {
    return this.startServer('elasticsearch', 'node', [
      'scripts/es',
      'snapshot',
      '--license',
      'trial',
      ...args,
    ]);
  }

  startKibana(args: string[] = []): ServerStatus {
    return this.startServer('kibana', 'node', [
      'scripts/kibana',
      '--dev',
      '--no-base-path',
      ...args,
    ]);
  }

  startCustomServer(name: string, command: string, args: string[] = []): ServerStatus {
    return this.startServer(name, command, args, 'custom');
  }

  stopServer(name: string): boolean {
    const server = this.servers.get(name);
    if (!server) return false;

    server.process.kill('SIGTERM');
    setTimeout(() => {
      if (!server.process.killed) {
        server.process.kill('SIGKILL');
      }
    }, 10000);

    return true;
  }

  stopAll(): void {
    for (const [name] of this.servers) {
      this.stopServer(name);
    }
  }

  private startServer(
    name: string,
    command: string,
    args: string[],
    type: ServerStatus['type'] = name as ServerStatus['type']
  ): ServerStatus {
    // Stop existing server if running
    if (this.servers.has(name)) {
      this.stopServer(name);
    }

    const child = spawn(command, args, {
      cwd: this.repoRoot,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
      },
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const status: ServerStatus = {
      type: type as ServerStatus['type'],
      name,
      status: 'starting',
      pid: child.pid,
      command: `${command} ${args.join(' ')}`,
    };

    const managed: ManagedServer = {
      process: child,
      status,
      output: [],
      startedAt: Date.now(),
    };

    this.servers.set(name, managed);

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      managed.output.push(text);
      // Keep output buffer manageable
      if (managed.output.length > 5000) {
        managed.output.splice(0, 1000);
      }

      // Detect when server is ready
      if (status.status === 'starting') {
        if (
          (name === 'elasticsearch' && text.includes('started')) ||
          (name === 'kibana' && text.includes('http server running'))
        ) {
          status.status = 'running';
          this.emit('server-status', { name, status: 'running' });
        }
      }

      this.emit('server-output', { name, data: text, stream: 'stdout' });
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      managed.output.push(text);
      if (managed.output.length > 5000) {
        managed.output.splice(0, 1000);
      }
      this.emit('server-output', { name, data: text, stream: 'stderr' });
    });

    child.on('close', (code) => {
      status.status = code === 0 ? 'stopped' : 'error';
      status.pid = undefined;
      this.emit('server-status', { name, status: status.status, exitCode: code });
      this.servers.delete(name);
    });

    child.on('error', (err) => {
      status.status = 'error';
      managed.output.push(`Error: ${err.message}`);
      this.emit('server-status', { name, status: 'error', error: err.message });
      this.servers.delete(name);
    });

    this.emit('server-status', { name, status: 'starting' });
    return status;
  }
}
