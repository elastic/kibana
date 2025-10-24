/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  promises as fs,
  readFileSync as fsReadFileSync,
  writeFileSync as fsWriteFileSync,
  appendFileSync as fsAppendFileSync,
  unlinkSync,
  existsSync as fsExistsSync,
  createReadStream as fsCreateReadStream,
  createWriteStream as fsCreateWriteStream,
} from 'fs';

import type { Readable, Writable, StreamOptions } from 'stream';
import type { WriteFileOptions, FileMetadata, WriteFileContent } from './types';
import { getSafePath, ensureDirectory, ensureDirectorySync } from './utils';

/**
 * Writes data to a file, replacing the file if `override` is true.
 */
export async function writeFile(
  name: string,
  content: WriteFileContent,
  options?: WriteFileOptions
): Promise<FileMetadata> {
  const { volume, override = true } = options ?? {};
  const { fullPath, alias } = getSafePath(name, volume);

  if (!override && fsExistsSync(fullPath)) {
    throw new Error(`File already exists: ${name}. Use override: true to replace it.`);
  }

  await ensureDirectory(fullPath);
  await fs.writeFile(fullPath, content);

  return { alias, path: fullPath };
}

/**
 * Appends data to a file, creating the file if it does not yet exist.
 */
export async function appendFile(
  name: string,
  content: string | Uint8Array,
  options?: WriteFileOptions
): Promise<FileMetadata> {
  const { fullPath, alias } = getSafePath(name, options?.volume);

  await ensureDirectory(fullPath);
  await fs.appendFile(fullPath, content);

  return { alias, path: fullPath };
}

/**
 * Creates a Writeable stream for writing to a file.
 */
export function createWriteStream(
  name: string,
  volume?: string,
  options?: BufferEncoding | StreamOptions<Writable>
): Writable {
  const { fullPath } = getSafePath(name, volume);

  ensureDirectorySync(fullPath);

  return fsCreateWriteStream(fullPath, options);
}

/**
 * Reads the entire contents of a file.
 */
export async function readFile(name: string, volume?: string): Promise<string | Buffer> {
  const { fullPath } = getSafePath(name, volume);

  return await fs.readFile(fullPath);
}

/**
 * Creates a Readable stream from a file.
 */
export function createReadStream(
  name: string,
  volume?: string,
  options?: BufferEncoding | StreamOptions<Readable>
): Readable {
  const { fullPath } = getSafePath(name, volume);

  return fsCreateReadStream(fullPath, options);
}

/**
 * Deletes a file.
 */
export async function deleteFile(
  name: string,
  options?: Pick<WriteFileOptions, 'volume'>
): Promise<void> {
  const { fullPath } = getSafePath(name, options?.volume);

  await fs.unlink(fullPath);
}

/**
 * Writes data to a file synchronously, replacing the file if `override` is true.
 */
export function writeFileSync(
  name: string,
  content: string | NodeJS.ArrayBufferView,
  options?: WriteFileOptions
): FileMetadata {
  const { volume, override = true } = options ?? {};
  const { fullPath, alias } = getSafePath(name, volume);

  // Check if file exists and override is not allowed
  if (!override && fsExistsSync(fullPath)) {
    throw new Error(`File already exists: ${name}. Use override: true to replace it.`);
  }

  ensureDirectorySync(fullPath);
  fsWriteFileSync(fullPath, content);

  return { alias, path: fullPath };
}

/**
 * Appends data to a file synchronously, creating the file if it does not yet exist.
 */
export function appendFileSync(
  name: string,
  content: string | Uint8Array,
  options?: WriteFileOptions
): FileMetadata {
  const { volume } = options ?? {};
  const { fullPath, alias } = getSafePath(name, volume);

  ensureDirectorySync(fullPath);
  fsAppendFileSync(fullPath, content);

  return { alias, path: fullPath };
}

/**
 * Reads the entire contents of a file synchronously.
 */
export function readFileSync(name: string, volume?: string): string | Buffer {
  const { fullPath } = getSafePath(name, volume);

  return fsReadFileSync(fullPath);
}

/**
 * Deletes a file synchronously.
 */
export function deleteFileSync(name: string, options?: Pick<WriteFileOptions, 'volume'>): void {
  const { fullPath } = getSafePath(name, options?.volume);

  unlinkSync(fullPath);
}

export function existsSync(path: string, volume?: string): boolean {
  const { fullPath } = getSafePath(path, volume);

  return fsExistsSync(fullPath);
}
