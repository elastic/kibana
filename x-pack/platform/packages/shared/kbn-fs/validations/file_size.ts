/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

export function validateFileSize(data: Buffer) {
  // Since data is guaranteed to be a Buffer, we can directly use its length property
  const fileSize = data.length;

  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
  }

  return true;
}
