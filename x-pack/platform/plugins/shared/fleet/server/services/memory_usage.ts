/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

function formatBytes(bytes: number, decimals = 0) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function logMemoryUsage(step: string) {
  console.log(`BEFORE GC ${step}`);

  const memoryUsage = process.memoryUsage();

  console.log(`HEAP TOTAL: ${formatBytes(memoryUsage.heapTotal)}`);
  console.log(`HEAP USED: ${formatBytes(memoryUsage.heapUsed)}`);
  console.log(`EXTERNAL: ${formatBytes(memoryUsage.external)}`);
  console.log(`ARRAY BUFFERS: ${formatBytes(memoryUsage.arrayBuffers)}`);

  if (global.gc) {
    global.gc();
  }
  console.log(`AFTER GC ${step}`);

  console.log(`HEAP TOTAL: ${formatBytes(memoryUsage.heapTotal)}`);
  console.log(`HEAP USED: ${formatBytes(memoryUsage.heapUsed)}`);
  console.log(`EXTERNAL: ${formatBytes(memoryUsage.external)}`);
  console.log(`ARRAY BUFFERS: ${formatBytes(memoryUsage.arrayBuffers)}`);
}
