/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fileDownloadInfo } from '@huggingface/hub';
import { Logger } from '@kbn/core/server';
import { Readable } from 'stream';
import streamWeb from 'stream/web';

export interface FileDownloadInfoOptions {
  repo: string;
  path: string;
  revision?: string;
  accessToken: string;
  hubUrl?: string;
}

export interface FileDownloadInfo {
  url: string;
  size: number;
}

/**
 * Gets download information for a file from HuggingFace Hub using the official library
 */
export async function getFileDownloadInfo(
  options: FileDownloadInfoOptions
): Promise<FileDownloadInfo> {
  const hubOptions = {
    repo: options.repo,
    path: options.path,
    revision: options.revision ?? 'main',
    hubUrl: options.hubUrl ?? 'https://huggingface.co/datasets',
    accessToken: options.accessToken,
  };

  const fileInfo = await fileDownloadInfo(hubOptions);

  if (!fileInfo) {
    throw new Error(
      `Cannot fetch file info for ${options.repo}/${options.path}@${hubOptions.revision}`
    );
  }

  return {
    url: fileInfo.url,
    size: fileInfo.size,
  };
}

/**
 * Creates a readable stream for a dataset file from HuggingFace.
 */
export async function createFileStream(
  options: FileDownloadInfoOptions,
  logger: Logger
): Promise<{
  stream: Readable;
  size: number;
  isGzip: boolean;
}> {
  const fileInfo = await getFileDownloadInfo(options);
  const { url, size } = fileInfo;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${options.accessToken}` },
  });

  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }

  const stream = Readable.fromWeb(response.body as unknown as streamWeb.ReadableStream<any>);
  const isGzip = new URL(url).searchParams.get('response-content-type') === 'application/gzip';
  logger.debug(
    `Created stream for ${options.repo}/${options.path}, size: ${size} bytes, gzip: ${isGzip}`
  );

  return {
    stream,
    size,
    isGzip,
  };
}

/**
 * Downloads a file from HuggingFace and retrieve a string.
 * This is useful for smaller files like configuration or mapping files that don't require streaming.
 */
export async function getFileContent(
  options: FileDownloadInfoOptions,
  logger: Logger
): Promise<string> {
  const fileInfo = await getFileDownloadInfo(options);
  const { url } = fileInfo;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${options.accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }

  const content = await response.text();

  logger.debug(
    `Fetched text file ${options.repo}/${options.path}, length: ${content.length} characters`
  );

  return content;
}
