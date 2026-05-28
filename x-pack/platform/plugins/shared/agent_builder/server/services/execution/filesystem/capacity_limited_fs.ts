/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ByteString, IFileSystem, FsStat } from 'just-bash';

const encoder = new TextEncoder();

const byteLengthOf = (content: string | Uint8Array): number =>
  typeof content === 'string' ? encoder.encode(content).length : content.byteLength;

const enospc = (op: string, path: string, limit: number) =>
  new Error(
    `ENOSPC: workspace capacity exceeded — ${op} '${path}' would exceed the ${limit}-byte limit`
  );

/**
 * Caps the total content size of an underlying writable `IFileSystem`. Writes
 * that would push the aggregate above `maxBytes` are rejected with `ENOSPC`.
 * Reads and non-growing operations (rm, mkdir, chmod, ...) pass through.
 *
 * The current size is computed by walking the fs on each mutation. That's O(n)
 * per write; acceptable for the workspace's tens-to-hundreds of small files at
 * worst. Revisit (cache + invalidate) if walk cost becomes measurable.
 */
export class CapacityLimitedFs implements IFileSystem {
  private readonly inner: IFileSystem;
  private readonly maxBytes: number;

  constructor(inner: IFileSystem, maxBytes: number) {
    this.inner = inner;
    this.maxBytes = maxBytes;
  }

  // ---- mutation paths with capacity enforcement ----

  async writeFile(
    path: string,
    content: string | Uint8Array,
    options?: Parameters<IFileSystem['writeFile']>[2]
  ): Promise<void> {
    const newBytes = byteLengthOf(content);
    const existingBytes = await this.tryGetFileSize(path);
    const projected = (await this.currentSize()) - existingBytes + newBytes;
    if (projected > this.maxBytes) throw enospc('writeFile', path, this.maxBytes);
    return this.inner.writeFile(path, content, options);
  }

  async appendFile(
    path: string,
    content: string | Uint8Array,
    options?: Parameters<IFileSystem['appendFile']>[2]
  ): Promise<void> {
    const addedBytes = byteLengthOf(content);
    const projected = (await this.currentSize()) + addedBytes;
    if (projected > this.maxBytes) throw enospc('appendFile', path, this.maxBytes);
    return this.inner.appendFile(path, content, options);
  }

  async cp(src: string, dest: string, options?: Parameters<IFileSystem['cp']>[2]): Promise<void> {
    const srcBytes = await this.subtreeSize(src);
    const existingDestBytes = await this.subtreeSize(dest);
    const projected = (await this.currentSize()) - existingDestBytes + srcBytes;
    if (projected > this.maxBytes) throw enospc('cp', dest, this.maxBytes);
    return this.inner.cp(src, dest, options);
  }

  // ---- pass-through (no growth or freeing) ----

  async readFile(path: string, options?: Parameters<IFileSystem['readFile']>[1]): Promise<string> {
    return this.inner.readFile(path, options);
  }
  async readFileBuffer(path: string): Promise<Uint8Array> {
    return this.inner.readFileBuffer(path);
  }
  async readFileBytes(path: string): Promise<ByteString> {
    return this.inner.readFileBytes!(path);
  }
  async exists(path: string): Promise<boolean> {
    return this.inner.exists(path);
  }
  async stat(path: string): Promise<FsStat> {
    return this.inner.stat(path);
  }
  async lstat(path: string): Promise<FsStat> {
    return this.inner.lstat(path);
  }
  async readdir(path: string): Promise<string[]> {
    return this.inner.readdir(path);
  }
  async readdirWithFileTypes(
    path: string
  ): Promise<
    Array<{ name: string; isFile: boolean; isDirectory: boolean; isSymbolicLink: boolean }>
  > {
    return this.inner.readdirWithFileTypes!(path);
  }
  getAllPaths(): string[] {
    return this.inner.getAllPaths();
  }
  resolvePath(base: string, path: string): string {
    return this.inner.resolvePath(base, path);
  }
  async realpath(path: string): Promise<string> {
    return this.inner.realpath(path);
  }
  async readlink(path: string): Promise<string> {
    return this.inner.readlink(path);
  }
  async mkdir(path: string, options?: Parameters<IFileSystem['mkdir']>[1]): Promise<void> {
    return this.inner.mkdir(path, options);
  }
  async rm(path: string, options?: Parameters<IFileSystem['rm']>[1]): Promise<void> {
    return this.inner.rm(path, options);
  }
  async mv(src: string, dest: string): Promise<void> {
    // Net-neutral within the same fs: bytes move from src to dest, total unchanged.
    return this.inner.mv(src, dest);
  }
  async chmod(path: string, mode: number): Promise<void> {
    return this.inner.chmod(path, mode);
  }
  async symlink(target: string, linkPath: string): Promise<void> {
    return this.inner.symlink(target, linkPath);
  }
  async link(existingPath: string, newPath: string): Promise<void> {
    return this.inner.link(existingPath, newPath);
  }
  async utimes(path: string, atime: Date, mtime: Date): Promise<void> {
    return this.inner.utimes(path, atime, mtime);
  }

  // ---- size helpers ----

  /** Total bytes used by all files in the fs. Directories don't count. */
  private async currentSize(): Promise<number> {
    return this.subtreeSize('/');
  }

  /** Recursively sums file sizes under `path`. Returns 0 if `path` doesn't exist. */
  private async subtreeSize(path: string): Promise<number> {
    if (!(await this.inner.exists(path))) return 0;
    try {
      const stat = await this.inner.stat(path);
      if (stat.isFile) return stat.size;
    } catch {
      return 0;
    }
    let total = 0;
    const walk = async (dir: string): Promise<void> => {
      const entries = await this.inner.readdirWithFileTypes!(dir);
      for (const entry of entries) {
        const child = dir === '/' ? `/${entry.name}` : `${dir}/${entry.name}`;
        if (entry.isFile) {
          const s = await this.inner.stat(child);
          total += s.size;
        } else if (entry.isDirectory) {
          await walk(child);
        }
      }
    };
    await walk(path);
    return total;
  }

  private async tryGetFileSize(path: string): Promise<number> {
    if (!(await this.inner.exists(path))) return 0;
    try {
      const stat = await this.inner.stat(path);
      return stat.isFile ? stat.size : 0;
    } catch {
      return 0;
    }
  }
}
