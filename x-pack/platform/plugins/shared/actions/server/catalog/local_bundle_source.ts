/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile, realpath, stat } from 'fs/promises';
import path from 'path';
import type { CatalogSource } from './types';

const isInsideRoot = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

export interface LocalBundleSourceOptions {
  root: string;
}

/** Reads a catalog bundle from disk with the same layout and size caps as the remote source. */
export class LocalBundleSource implements CatalogSource {
  public readonly origin: string;
  private readonly root: string;

  constructor(options: LocalBundleSourceOptions) {
    this.root = path.resolve(options.root);
    this.origin = `file://${this.root}`;
  }

  public async readManifest(): Promise<{ bytes: string; signature: string }> {
    const [bytes, signature] = await Promise.all([
      this.readText('catalog.json', 1024 * 1024),
      this.readText('catalog.json.sig', 4096),
    ]);
    return { bytes, signature: signature.trim() };
  }

  public async readText(relativePath: string, maxBytes: number): Promise<string> {
    if (relativePath.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(relativePath)) {
      throw new Error(`Catalog bundle path "${relativePath}" must be relative to the bundle root.`);
    }
    const resolved = path.resolve(this.root, relativePath);
    if (!isInsideRoot(this.root, resolved)) {
      throw new Error(`Catalog bundle path "${relativePath}" escapes the bundle root.`);
    }
    let canonical: string;
    try {
      canonical = await realpath(resolved);
    } catch (error) {
      throw new Error(`Catalog bundle file "${relativePath}" is not readable.`, { cause: error });
    }
    const canonicalRoot = await realpath(this.root);
    if (!isInsideRoot(canonicalRoot, canonical)) {
      throw new Error(`Catalog bundle path "${relativePath}" escapes the bundle root.`);
    }
    const fileStat = await stat(canonical);
    if (!fileStat.isFile()) {
      throw new Error(`Catalog bundle path "${relativePath}" is not a file.`);
    }
    if (fileStat.size > maxBytes) {
      throw new Error(`Catalog bundle file "${relativePath}" exceeded the ${maxBytes} byte limit.`);
    }
    return readFile(canonical, 'utf8');
  }
}
