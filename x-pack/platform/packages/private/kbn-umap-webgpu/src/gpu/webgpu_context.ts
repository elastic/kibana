/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * WebGPU device/context management.
 *
 * Handles adapter/device acquisition and provides a shared context
 * for all GPU compute operations.
 */

let cachedDevice: GPUDevice | null = null;

/** Check whether WebGPU is available in the current environment. */
export function isWebGPUAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/**
 * Get (or create) a shared GPUDevice.
 * Returns null if WebGPU is not available.
 */
export async function getDevice(): Promise<GPUDevice | null> {
  if (cachedDevice) return cachedDevice;
  if (!isWebGPUAvailable()) return null;

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return null;

  cachedDevice = await adapter.requestDevice({
    requiredLimits: {
      maxBufferSize: adapter.limits.maxBufferSize,
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxComputeWorkgroupSizeX: adapter.limits.maxComputeWorkgroupSizeX,
      maxComputeInvocationsPerWorkgroup: adapter.limits.maxComputeInvocationsPerWorkgroup,
    },
  });

  cachedDevice.lost.then(() => {
    cachedDevice = null;
  });

  return cachedDevice;
}

/** Release the cached device. */
export function releaseDevice(): void {
  if (cachedDevice) {
    cachedDevice.destroy();
    cachedDevice = null;
  }
}
