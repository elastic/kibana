/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ShimUsageLog } from './shim_usage_log';

/**
 * A `WebGLRenderingContext` that accepts every call and draws nothing.
 *
 * Map panels run the real MapLibre GL JS `Map`, which refuses to construct without a GL
 * context. It is never asked to actually draw: its worker pool is a no-op here, so no tile
 * ever reaches the painter, and the pixels come from MapLibre Native (see
 * `render_map_panel.ts`). What the real `Map` is *for* is running the maps client's own style
 * sync -- sources, layers, feature-state joins, images -- which is then read back out.
 *
 * `getContext('webgl')` only needs to look plausible to `Painter`/`Context`: capability
 * queries return sane numbers, shader/program status checks pass, object factories return
 * tokens, and everything else is a no-op. Every method touched is recorded once in the usage
 * log (`webgl.<method>`), so a live run shows what the painter really calls.
 */
export const createWebGLStub = (
  canvas: unknown,
  usageLog: ShimUsageLog,
  attributes: unknown
): WebGLRenderingContext => {
  const constants = new Map<string, number>();
  let nextConstant = 0x1000;
  const constant = (name: string) => {
    let value = constants.get(name);
    if (value === undefined) {
      value = nextConstant++;
      constants.set(name, value);
    }
    return value;
  };
  // Values some code compares against directly.
  const PINNED: Record<string, number> = {
    NO_ERROR: 0,
    FALSE: 0,
    TRUE: 1,
    FRAMEBUFFER_COMPLETE: 0x8cd5,
  };
  for (const [name, value] of Object.entries(PINNED)) constants.set(name, value);

  const seen = new Set<string>();
  const note = (method: string) => {
    if (!seen.has(method)) {
      seen.add(method);
      usageLog.record(`webgl.${method}`);
    }
  };

  let attribLocation = 0;
  const extensionStub = (): unknown =>
    new Proxy(
      {},
      {
        get: (_target, prop) =>
          typeof prop === 'string' && /^[A-Z0-9_]+$/.test(prop) ? constant(prop) : () => ({}),
      }
    );

  const overrides: Record<string, (...args: unknown[]) => unknown> = {
    getError: () => PINNED.NO_ERROR,
    isContextLost: () => false,
    checkFramebufferStatus: () => PINNED.FRAMEBUFFER_COMPLETE,
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    getShaderInfoLog: () => '',
    getProgramInfoLog: () => '',
    getSupportedExtensions: () => [],
    getExtension: () => extensionStub(),
    getContextAttributes: () => attributes ?? {},
    getAttribLocation: () => attribLocation++,
    getUniformLocation: () => ({}),
    getShaderPrecisionFormat: () => ({ rangeMin: 127, rangeMax: 127, precision: 23 }),
    getParameter: (pname) => {
      switch (pname) {
        case constant('VERSION'):
          return 'WebGL 1.0 (reporting stub)';
        case constant('MAX_TEXTURE_SIZE'):
        case constant('MAX_RENDERBUFFER_SIZE'):
          return 8192;
        case constant('MAX_VERTEX_ATTRIBS'):
        case constant('MAX_TEXTURE_IMAGE_UNITS'):
        case constant('MAX_COMBINED_TEXTURE_IMAGE_UNITS'):
          return 16;
        case constant('ALIASED_LINE_WIDTH_RANGE'):
          return [1, 1];
        case constant('VIEWPORT'):
          return [0, 0, (canvas as { width: number }).width, (canvas as { height: number }).height];
        default:
          return 0;
      }
    },
  };

  const target: Record<string, unknown> = {};
  return new Proxy(target, {
    get: (_target, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (prop === 'canvas') return canvas;
      if (prop === 'drawingBufferWidth') return (canvas as { width: number }).width;
      if (prop === 'drawingBufferHeight') return (canvas as { height: number }).height;
      if (/^[A-Z][A-Z0-9_]*$/.test(prop)) return constant(prop);
      return (...args: unknown[]) => {
        note(prop);
        const override = overrides[prop];
        if (override) return override(...args);
        if (/^create/.test(prop)) return {};
        return undefined;
      };
    },
    set: () => true,
  }) as unknown as WebGLRenderingContext;
};
