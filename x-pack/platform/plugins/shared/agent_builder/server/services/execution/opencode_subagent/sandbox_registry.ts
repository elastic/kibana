/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Sandbox, SandboxProvider, SandboxSpec } from './sandbox_provider';

export interface SandboxRegistryConfig {
  /** Reap a sandbox after this much inactivity in its conversation. */
  idleTtlMs: number;
  /** Hard cap on a sandbox's lifetime regardless of activity. */
  maxLifetimeMs: number;
  /** How often the reaper checks for idle/expired sandboxes. */
  reaperIntervalMs: number;
}

export const DEFAULT_REGISTRY_CONFIG: SandboxRegistryConfig = {
  idleTtlMs: 20 * 60 * 1000, // 20 min idle
  maxLifetimeMs: 2 * 60 * 60 * 1000, // 2 h hard cap
  reaperIntervalMs: 60 * 1000, // sweep every minute
};

interface SandboxLease {
  conversationId: string;
  sandbox: Sandbox;
  createdAt: number;
  lastUsedAt: number;
  /** Number of in-flight turns holding this sandbox (kept warm, never reaped). */
  activeTurns: number;
  /** Prevents a double-release / double-reap race. */
  releasing: boolean;
}

/**
 * Keeps one warm sandbox per conversation so consecutive coding turns reuse the
 * same workspace (the repo clone, installed deps, edited files survive) instead
 * of provisioning + re-cloning every turn — the core of "Model C".
 *
 * Warmth is pod-only: the sandbox stays alive, but each turn spawns a fresh
 * coding-agent process. What persists between turns is the on-disk /workspace,
 * which is where the expensive state (the clone) lives.
 *
 * Provider-agnostic: it operates on the `Sandbox` abstraction, so the same
 * lifecycle drives the local Kubernetes provider today and a Cloud Run provider
 * later without changes.
 */
export class SandboxRegistry {
  private readonly leases = new Map<string, SandboxLease>();
  private reaper?: ReturnType<typeof setInterval>;

  constructor(
    private readonly provider: SandboxProvider,
    private readonly logger: Logger,
    private readonly config: SandboxRegistryConfig = DEFAULT_REGISTRY_CONFIG
  ) {}

  start(): void {
    if (this.reaper) return;
    this.reaper = setInterval(() => {
      void this.reapIdle();
    }, this.config.reaperIntervalMs);
    // Don't keep the event loop alive just for the reaper.
    this.reaper.unref?.();
  }

  stop(): void {
    if (this.reaper) {
      clearInterval(this.reaper);
      this.reaper = undefined;
    }
  }

  /**
   * Acquire a warm sandbox for a conversation, provisioning one only if none is
   * present. The caller MUST call `release()` when its turn ends so the idle
   * clock starts. `spec` is used only when a fresh sandbox is created.
   *
   * Returns whether the sandbox was reused (for UI messaging) and the sandbox.
   */
  async acquire(
    conversationId: string,
    spec: SandboxSpec
  ): Promise<{ sandbox: Sandbox; reused: boolean }> {
    const existing = this.leases.get(conversationId);
    if (existing && !existing.releasing && (await this.isHealthy(existing.sandbox))) {
      existing.activeTurns += 1;
      existing.lastUsedAt = Date.now();
      this.logger.debug(
        `Reusing warm sandbox ${existing.sandbox.id} for conversation ${conversationId}`
      );
      return { sandbox: existing.sandbox, reused: true };
    }

    // Stale/unhealthy lease: drop it (best-effort tear down) before provisioning.
    if (existing) {
      this.leases.delete(conversationId);
      void existing.sandbox.stop().catch(() => {});
    }

    const sandbox = await this.provider.create(spec);
    const now = Date.now();
    this.leases.set(conversationId, {
      conversationId,
      sandbox,
      createdAt: now,
      lastUsedAt: now,
      activeTurns: 1,
      releasing: false,
    });
    this.logger.debug(
      `Provisioned sandbox ${sandbox.id} for conversation ${conversationId} (warm reuse enabled)`
    );
    return { sandbox, reused: false };
  }

  /**
   * Release a turn's hold on the conversation's sandbox. The sandbox stays warm;
   * the idle clock (re)starts once no turn is in flight. If `discard` is set
   * (e.g. a fatal error left the sandbox unusable), it is torn down immediately.
   */
  async release(conversationId: string, { discard = false }: { discard?: boolean } = {}) {
    const lease = this.leases.get(conversationId);
    if (!lease) return;
    lease.activeTurns = Math.max(0, lease.activeTurns - 1);
    lease.lastUsedAt = Date.now();
    if (discard) {
      await this.reap(conversationId);
    }
  }

  /** Sandbox currently associated with a conversation, if any. */
  getSandbox(conversationId: string): Sandbox | undefined {
    return this.leases.get(conversationId)?.sandbox;
  }

  private async isHealthy(sandbox: Sandbox): Promise<boolean> {
    try {
      const desc = await sandbox.describe();
      return desc.ready && desc.phase === 'Running';
    } catch {
      // If we can't tell, assume unhealthy so we re-provision rather than hang.
      return false;
    }
  }

  private async reapIdle(): Promise<void> {
    const now = Date.now();
    const toReap: string[] = [];
    for (const [conversationId, lease] of this.leases) {
      if (lease.releasing || lease.activeTurns > 0) continue;
      const idle = now - lease.lastUsedAt >= this.config.idleTtlMs;
      const expired = now - lease.createdAt >= this.config.maxLifetimeMs;
      if (idle || expired) {
        toReap.push(conversationId);
        this.logger.info(
          `Reaping sandbox ${lease.sandbox.id} for conversation ${conversationId} ` +
            `(${expired ? 'max lifetime' : 'idle'})`
        );
      }
    }
    for (const conversationId of toReap) {
      await this.reap(conversationId);
    }
  }

  private async reap(conversationId: string): Promise<void> {
    const lease = this.leases.get(conversationId);
    if (!lease || lease.releasing) return;
    lease.releasing = true;
    this.leases.delete(conversationId);
    try {
      await lease.sandbox.stop();
    } catch (e) {
      this.logger.warn(`Failed to reap sandbox ${lease.sandbox.id}: ${(e as Error).message}`);
    }
  }

  /** Tear down every warm sandbox (e.g. on plugin stop). Never throws. */
  async reapAll(): Promise<void> {
    const conversations = [...this.leases.keys()];
    for (const conversationId of conversations) {
      await this.reap(conversationId);
    }
  }
}
