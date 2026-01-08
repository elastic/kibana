/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GpuCapabilities } from './types';

let cachedCapabilities: GpuCapabilities | null = null;

/**
 * Check if we're running in a browser environment
 */
function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Detect WebGL2 and WebGPU capabilities
 * Results are cached after first detection
 */
export function detectGpuCapabilities(): GpuCapabilities {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  const capabilities: GpuCapabilities = {
    webgl2Available: false,
    webgpuAvailable: false,
    hasPerformanceCaveat: false,
    maxTextureSize: 0,
    maxVertexAttributes: 0,
    renderer: 'unknown',
  };

  // Skip detection if not in browser environment
  if (!isBrowserEnvironment()) {
    cachedCapabilities = capabilities;
    return capabilities;
  }

  // Detect WebGL2
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');

    if (gl) {
      capabilities.webgl2Available = true;
      capabilities.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      capabilities.maxVertexAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        capabilities.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }

      // Check for performance caveat (software rendering)
      const glWithCaveat = canvas.getContext('webgl2', {
        failIfMajorPerformanceCaveat: true,
      });
      capabilities.hasPerformanceCaveat = !glWithCaveat;
    }
  } catch {
    // WebGL2 not available
  }

  // Detect WebGPU (optional enhancement)
  try {
    if ('gpu' in navigator) {
      // WebGPU is available in the browser
      // Note: Actual adapter request is async and done lazily when needed
      capabilities.webgpuAvailable = true;
    }
  } catch {
    // WebGPU not available
  }

  cachedCapabilities = capabilities;
  return capabilities;
}

/**
 * Check if GPU rendering is supported
 */
export function isGpuRenderingSupported(): boolean {
  const caps = detectGpuCapabilities();
  return caps.webgl2Available && !caps.hasPerformanceCaveat;
}

/**
 * Get a human-readable GPU capability summary for debugging
 */
export function getGpuCapabilitySummary(): string {
  const caps = detectGpuCapabilities();

  if (!caps.webgl2Available) {
    return 'WebGL2 is not available. GPU-accelerated charts cannot be rendered.';
  }

  if (caps.hasPerformanceCaveat) {
    return `WebGL2 is using software rendering (${caps.renderer}). Performance may be degraded.`;
  }

  const features = [
    `WebGL2: ✓`,
    `WebGPU: ${caps.webgpuAvailable ? '✓' : '✗'}`,
    `Renderer: ${caps.renderer}`,
    `Max texture: ${caps.maxTextureSize}px`,
  ];

  return features.join(' | ');
}

// WebGPU types for environments that support it
interface NavigatorWithGPU extends Navigator {
  gpu?: {
    requestAdapter(options?: {
      powerPreference?: 'low-power' | 'high-performance';
    }): Promise<unknown>;
  };
}

/**
 * Request WebGPU adapter if available (async)
 * Returns null if WebGPU is not available or request fails
 */
export async function requestWebGpuAdapter(): Promise<unknown | null> {
  const caps = detectGpuCapabilities();

  if (!caps.webgpuAvailable) {
    return null;
  }

  try {
    const navigatorWithGpu = navigator as NavigatorWithGPU;
    if (!navigatorWithGpu.gpu) {
      return null;
    }
    const adapter = await navigatorWithGpu.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });
    return adapter;
  } catch {
    return null;
  }
}
