/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// `@kbn/fs` is not usable here: these are Linux cgroup v2 kernel pseudo-files under
// `/sys/fs/cgroup` (e.g. `memory.max`, `cgroup.procs`), not user-supplied content under
// Kibana's data directory that `@kbn/fs`'s `getSafePath`/sanitization model is built for.
/* eslint-disable @kbn/eslint/require_kbn_fs */
import fs from 'fs';
import path from 'path';
import type { Logger } from '@kbn/logging';

const CGROUP_ROOT = '/sys/fs/cgroup';

export type CgroupCapability = { supported: true } | { supported: false; reason: string };

export interface ChildCgroupHandle {
  readonly id: string;
  readonly dirPath: string;
  /** Moves `pid` into this child's cgroup. Must be called before the child runs task code. */
  place(pid: number): void;
  /** Number of times the kernel OOM-killed something in this cgroup (from `memory.events`). */
  readOomKillCount(): number;
  /** Removes the child's cgroup directory. Safe to call multiple times. */
  cleanup(): void;
}

/**
 * Manages a cgroup v2 hierarchy under Kibana's own cgroup so each worker-process child gets
 * a dedicated cgroup with a kernel-enforced `memory.max` and a fair-share `cpu.weight`. This
 * is what makes a task's declared `memoryMb` a genuine, unspoofable-by-userspace guarantee
 * (covering JS heap, Buffers, and native memory - not just the V8 heap) and what protects
 * Kibana's own event loop and lighter tasks from CPU-heavy worker processes. See the
 * "Child-Process Task Pool" plan for the full rationale.
 *
 * Requires Linux with cgroups v2 mounted as the unified hierarchy and a writable, delegated
 * subtree containing the `memory` and `cpu` controllers - true in Docker/Cloud/ECE/ECK, not
 * on macOS/Windows dev machines or Kubernetes without a writable cgroup mount. Capability is
 * detected once, in `setup()`, and exposed via `capability` for the pool to decide whether it
 * can offer hard guarantees or must fall back (see `WorkerPoolService`).
 *
 * Layout, mirroring the "no internal process" constraint of cgroups v2 (a cgroup with
 * controllers enabled on its children can't itself hold processes):
 *
 *   <kibana's own cgroup>/
 *     main/     <- Kibana's own PID lives here; cpu.weight=1000 (favored under contention)
 *     tasks/
 *       cpu.weight=100  <- all worker processes combined get ~1/10th of Kibana's CPU share
 *       <child-id>/     <- one per in-flight worker process
 *         memory.max, memory.swap.max=0, memory.oom.group=1, cpu.weight=100, [cpu.max]
 */
export class CgroupEnforcer {
  private readonly logger: Logger;
  private _capability: CgroupCapability = { supported: false, reason: 'not yet detected' };
  private basePath?: string;
  private mainPath?: string;
  private tasksPath?: string;
  private nextChildId = 0;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public get capability(): CgroupCapability {
    return this._capability;
  }

  /**
   * Detects capability and, if available, creates the `main/`/`tasks/` hierarchy and moves
   * Kibana's own process into `main/`. Idempotent-safe to call once at pool start; failures
   * downgrade `capability` to unsupported rather than throwing, so the pool can still start
   * in fallback mode (or refuse to start, under `enforcement: 'strict'`).
   */
  public setup(): void {
    this._capability = this.detect();
    if (!this._capability.supported) {
      return;
    }
    try {
      this.initHierarchy();
    } catch (err) {
      this._capability = {
        supported: false,
        reason: `failed to initialize cgroup hierarchy: ${err.message}`,
      };
    }
  }

  private detect(): CgroupCapability {
    if (process.platform !== 'linux') {
      return {
        supported: false,
        reason: `unsupported platform "${process.platform}" (cgroups v2 is Linux-only)`,
      };
    }
    if (!fs.existsSync(path.join(CGROUP_ROOT, 'cgroup.controllers'))) {
      return {
        supported: false,
        reason: 'cgroup v2 unified hierarchy is not mounted at /sys/fs/cgroup',
      };
    }

    let ownRelativePath: string;
    try {
      ownRelativePath = this.readOwnCgroupPath();
    } catch (err) {
      return {
        supported: false,
        reason: `could not resolve own cgroup from /proc/self/cgroup: ${err.message}`,
      };
    }

    const ownAbsolutePath = path.join(CGROUP_ROOT, ownRelativePath);
    const controllersFile = path.join(ownAbsolutePath, 'cgroup.controllers');
    let controllers: string;
    try {
      controllers = fs.readFileSync(controllersFile, 'utf8');
    } catch (err) {
      return { supported: false, reason: `cannot read ${controllersFile}: ${err.message}` };
    }
    if (!controllers.includes('memory') || !controllers.includes('cpu')) {
      return {
        supported: false,
        reason: `"memory" and "cpu" controllers are not both delegated to ${ownAbsolutePath} (available: ${controllers.trim()})`,
      };
    }
    try {
      fs.accessSync(ownAbsolutePath, fs.constants.W_OK);
    } catch (err) {
      return { supported: false, reason: `${ownAbsolutePath} is not writable: ${err.message}` };
    }

    this.basePath = ownAbsolutePath;
    return { supported: true };
  }

  private readOwnCgroupPath(): string {
    const contents = fs.readFileSync('/proc/self/cgroup', 'utf8').trim();
    // cgroup v2 processes have a single "0::<path>" line (v1 hybrid entries use other hierarchy IDs).
    const line = contents.split('\n').find((l) => l.startsWith('0::'));
    if (!line) {
      throw new Error('no cgroup v2 (0::) entry found in /proc/self/cgroup');
    }
    return line.slice('0::'.length);
  }

  private initHierarchy(): void {
    if (!this.basePath) {
      throw new Error('base cgroup path was not resolved');
    }
    this.mainPath = path.join(this.basePath, 'main');
    this.tasksPath = path.join(this.basePath, 'tasks');

    // Sweep any stale per-child cgroups left behind by a previous, uncleanly-stopped process.
    this.sweepStaleChildren();

    fs.mkdirSync(this.mainPath, { recursive: true });
    fs.mkdirSync(this.tasksPath, { recursive: true });

    // The "no internal process" rule means a cgroup can't both hold processes directly and
    // have children with controllers enabled, so Kibana's own PID must move into `main/`
    // before `+memory +cpu` is enabled on the base cgroup's children.
    fs.writeFileSync(path.join(this.mainPath, 'cgroup.procs'), String(process.pid));
    fs.writeFileSync(path.join(this.basePath, 'cgroup.subtree_control'), '+memory +cpu\n');
    // Enabling a controller in a cgroup's `subtree_control` only activates it for that
    // cgroup's *direct* children (here: `main/` and `tasks/` themselves). Each per-child
    // cgroup created under `tasks/` is a grandchild of `basePath`, so the controllers must
    // be delegated one level further, from `tasks/` down to its own children, or
    // `memory.max`/`cpu.weight` writes on those per-child cgroups fail with EACCES.
    fs.writeFileSync(path.join(this.tasksPath, 'cgroup.subtree_control'), '+memory +cpu\n');

    // Kibana's event loop gets ~10x the CPU share of all worker processes combined under
    // contention; both weights are work-conserving, so idle CPU is still available to tasks.
    this.writeIfExists(path.join(this.mainPath, 'cpu.weight'), '1000');
    this.writeIfExists(path.join(this.tasksPath, 'cpu.weight'), '100');
  }

  private sweepStaleChildren(): void {
    if (!this.tasksPath || !fs.existsSync(this.tasksPath)) {
      return;
    }
    for (const entry of fs.readdirSync(this.tasksPath)) {
      try {
        fs.rmdirSync(path.join(this.tasksPath, entry));
      } catch (err) {
        this.logger.debug(`Could not sweep stale worker-process cgroup "${entry}": ${err.message}`);
      }
    }
  }

  private writeIfExists(file: string, value: string): void {
    try {
      fs.writeFileSync(file, value);
    } catch (err) {
      this.logger.debug(`Could not write ${file}: ${err.message}`);
    }
  }

  /**
   * Creates a dedicated cgroup for one worker-process child, hard-capping its memory at
   * `memoryLimitMb` - kernel-enforced, covering JS heap, Buffers, and native allocations,
   * unlike V8 `resourceLimits` - and giving it an equal `cpu.weight` share among sibling
   * worker processes. Call `place()` on the returned handle with the child's PID before the
   * child touches task code (between its `ready` and `go` messages).
   */
  public createChildCgroup(memoryLimitMb: number, cpuMaxPercent?: number): ChildCgroupHandle {
    if (!this._capability.supported || !this.tasksPath) {
      throw new Error('cgroup enforcement is not available');
    }

    const id = `child-${process.pid}-${this.nextChildId++}-${Date.now()}`;
    const dirPath = path.join(this.tasksPath, id);
    fs.mkdirSync(dirPath, { recursive: true });

    fs.writeFileSync(path.join(dirPath, 'memory.max'), String(memoryLimitMb * 1024 * 1024));
    // The budget is real RAM, not RAM-plus-swap - no silent escape via swapping.
    this.writeIfExists(path.join(dirPath, 'memory.swap.max'), '0');
    // The whole child (and anything it spawns) is OOM-killed together, not one process at a time.
    this.writeIfExists(path.join(dirPath, 'memory.oom.group'), '1');
    this.writeIfExists(path.join(dirPath, 'cpu.weight'), '100');
    if (cpuMaxPercent != null) {
      const quotaUs = Math.round(cpuMaxPercent * 1000);
      this.writeIfExists(path.join(dirPath, 'cpu.max'), `${quotaUs} 100000`);
    }

    const cleanup = () => {
      try {
        fs.rmdirSync(dirPath);
      } catch {
        // The kernel refuses rmdir while any PID remains (e.g. a slow-exiting killed child);
        // retry once shortly after. If it still fails, `sweepStaleChildren()` reclaims it on
        // the next pool start.
        setTimeout(() => {
          try {
            fs.rmdirSync(dirPath);
          } catch {
            // best-effort
          }
        }, 200).unref();
      }
    };

    return {
      id,
      dirPath,
      place: (pid: number) => {
        fs.writeFileSync(path.join(dirPath, 'cgroup.procs'), String(pid));
      },
      readOomKillCount: () => {
        try {
          const events = fs.readFileSync(path.join(dirPath, 'memory.events'), 'utf8');
          const match = events.match(/oom_kill (\d+)/);
          return match ? Number(match[1]) : 0;
        } catch {
          return 0;
        }
      },
      cleanup,
    };
  }
}
