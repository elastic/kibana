/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

const allowedExtensions = [
  '.txt',
  '.md',
  '.log',
  '.json',
  '.yml',
  '.yaml',
  '.csv',
  '.svg',
  '.png',
  '.zip',
];

export function validateFileExtension(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const hasAllowedExtension = allowedExtensions.includes(extension);

  if (!hasAllowedExtension) {
    throw new Error(
      `Invalid file type: "${filePath}". Only ${allowedExtensions.join(', ')} files are allowed.`
    );
  }
}
