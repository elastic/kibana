/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac, createHash } from 'crypto';

export interface S3PresignParams {
  /** Base URL of the S3-compatible service, e.g. 'http://localhost:9000' for MinIO. */
  endpoint: string;
  bucket: string;
  key: string;
  method: 'GET' | 'PUT' | 'HEAD';
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  /** URL validity in seconds (default: 3600). */
  expiresIn?: number;
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function hmacSha256Hex(key: Buffer | string, data: string): string {
  return createHmac('sha256', key).update(data, 'utf8').digest('hex');
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function getSigningKey(secretKey: string, dateStamp: string, region: string): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, 's3');
  return hmacSha256(kService, 'aws4_request');
}

/**
 * Generate an AWS SigV4 presigned URL for S3-compatible object storage (including MinIO).
 * Uses query-string signing (X-Amz-* params), no extra npm dependencies.
 */
export const presignS3Url = ({
  endpoint,
  bucket,
  key,
  method,
  accessKeyId,
  secretAccessKey,
  region,
  expiresIn = 3600,
}: S3PresignParams): string => {
  const now = new Date();
  // Format: YYYYMMDDTHHMMSSZ
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const dateStamp = amzDate.slice(0, 8);

  const url = new URL(`${endpoint}/${bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`);
  const host = url.host;
  const canonicalUri = url.pathname;

  const credential = `${accessKeyId}/${dateStamp}/${region}/s3/aws4_request`;

  // Build the 5 presigned query parameters, sorted lexicographically by key.
  const presignParams: Array<[string, string]> = (
    [
      ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
      ['X-Amz-Credential', credential],
      ['X-Amz-Date', amzDate],
      ['X-Amz-Expires', String(expiresIn)],
      ['X-Amz-SignedHeaders', 'host'],
    ] as Array<[string, string]>
  ).sort(([a], [b]) => a.localeCompare(b));

  // RFC 3986 percent-encode each key and value.
  const canonicalQueryString = presignParams
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  // Canonical request (UNSIGNED-PAYLOAD for presigned URLs).
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    `${dateStamp}/${region}/s3/aws4_request`,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region);
  const signature = hmacSha256Hex(signingKey, stringToSign);

  return `${url.origin}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
};
