/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn, type ChildProcess } from 'child_process';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import type { TestConfig, TestRunResult, TestRunStatus, TestRunEvent } from '../types';

export class TestRunner extends EventEmitter {
  private readonly repoRoot: string;
  private readonly activeRuns: Map<string, { process: ChildProcess; result: TestRunResult }> =
    new Map();
  private readonly completedRuns: TestRunResult[] = [];

  constructor(repoRoot: string) {
    super();
    this.repoRoot = repoRoot;
  }

  getActiveRuns(): TestRunResult[] {
    return [...this.activeRuns.values()].map((r) => r.result);
  }

  getCompletedRuns(): TestRunResult[] {
    return [...this.completedRuns];
  }

  getAllRuns(): TestRunResult[] {
    return [...this.getActiveRuns(), ...this.completedRuns];
  }

  getRunById(runId: string): TestRunResult | undefined {
    const active = this.activeRuns.get(runId);
    if (active) return active.result;
    return this.completedRuns.find((r) => r.id === runId);
  }

  stopRun(runId: string): boolean {
    const active = this.activeRuns.get(runId);
    if (!active) return false;

    active.process.kill('SIGTERM');
    // Give it a few seconds, then force kill
    setTimeout(() => {
      if (active.process.killed === false) {
        active.process.kill('SIGKILL');
      }
    }, 5000);

    return true;
  }

  startRepeatedRun(
    config: TestConfig,
    repeatCount: number,
    extraArgs: string[] = []
  ): string {
    const batchId = crypto.randomUUID().slice(0, 8);
    let currentIteration = 0;

    const runNext = (): void => {
      currentIteration++;
      if (currentIteration > repeatCount) return;

      const runId = this.startRun(config, extraArgs, {
        iteration: currentIteration,
        totalIterations: repeatCount,
        repeatBatchId: batchId,
      });

      const check = (): void => {
        const run = this.getRunById(runId);
        if (run && (run.status === 'passed' || run.status === 'failed' || run.status === 'stopped')) {
          if (run.status === 'failed' || run.status === 'stopped' || currentIteration >= repeatCount) {
            return;
          }
          runNext();
        } else {
          setTimeout(check, 1000);
        }
      };
      setTimeout(check, 1000);
    };

    runNext();
    return batchId;
  }

  startRun(
    config: TestConfig,
    extraArgs: string[] = [],
    repeatInfo?: { iteration: number; totalIterations: number; repeatBatchId: string }
  ): string {
    const runId = crypto.randomUUID().slice(0, 8);
    const { command, args } = this.buildCommand(config, extraArgs);

    const result: TestRunResult = {
      id: runId,
      configId: config.id,
      status: 'starting',
      startedAt: new Date().toISOString(),
      output: [],
      errorOutput: [],
      ...(repeatInfo ? {
        iteration: repeatInfo.iteration,
        totalIterations: repeatInfo.totalIterations,
        repeatBatchId: repeatInfo.repeatBatchId,
      } : {}),
    };

    const child = spawn(command, args, {
      cwd: this.repoRoot,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        NODE_OPTIONS: '--max-old-space-size=4096',
      },
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.activeRuns.set(runId, { process: child, result });

    this.updateStatus(runId, 'running');

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      result.output.push(text);
      this.emitEvent({
        type: 'output',
        runId,
        data: text,
        timestamp: new Date().toISOString(),
      });
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      result.errorOutput.push(text);
      this.emitEvent({
        type: 'error',
        runId,
        data: text,
        timestamp: new Date().toISOString(),
      });
    });

    child.on('close', (code) => {
      result.exitCode = code ?? 1;
      result.finishedAt = new Date().toISOString();
      const finalStatus: TestRunStatus = code === 0 ? 'passed' : 'failed';
      result.status = finalStatus;

      this.activeRuns.delete(runId);
      this.completedRuns.unshift(result);

      // Keep only the last 50 completed runs
      if (this.completedRuns.length > 50) {
        this.completedRuns.pop();
      }

      this.emitEvent({
        type: 'complete',
        runId,
        data: JSON.stringify({ exitCode: code, status: finalStatus }),
        timestamp: new Date().toISOString(),
      });
    });

    child.on('error', (err) => {
      result.status = 'failed';
      result.finishedAt = new Date().toISOString();
      result.errorOutput.push(err.message);

      this.activeRuns.delete(runId);
      this.completedRuns.unshift(result);

      this.emitEvent({
        type: 'complete',
        runId,
        data: JSON.stringify({ error: err.message, status: 'failed' }),
        timestamp: new Date().toISOString(),
      });
    });

    return runId;
  }

  private buildCommand(
    config: TestConfig,
    extraArgs: string[]
  ): { command: string; args: string[] } {
    switch (config.type) {
      case 'jest':
        return {
          command: 'node',
          args: ['scripts/jest', '--config', config.relativePath, '--verbose', ...extraArgs],
        };

      case 'jest-integration':
        return {
          command: 'node',
          args: ['scripts/jest_integration', '--config', config.relativePath, ...extraArgs],
        };

      case 'scout':
        return {
          command: 'node',
          args: ['scripts/scout', 'run-tests', '--config', config.relativePath, ...extraArgs],
        };

      case 'ftr':
        return {
          command: 'node',
          args: ['scripts/functional_test_runner', '--config', config.relativePath, ...extraArgs],
        };

      case 'ci-check':
        return {
          command: config.command ?? 'node',
          args: [...(config.commandArgs ?? []), ...extraArgs],
        };

      default:
        throw new Error(`Unknown test type: ${(config as { type: string }).type}`);
    }
  }

  private updateStatus(runId: string, status: TestRunStatus): void {
    const active = this.activeRuns.get(runId);
    if (active) {
      active.result.status = status;
      this.emitEvent({
        type: 'status',
        runId,
        data: status,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private emitEvent(event: TestRunEvent): void {
    this.emit('test-event', event);
  }

  destroy(): void {
    for (const [runId] of this.activeRuns) {
      this.stopRun(runId);
    }
  }
}
