/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHeadlessDomEnvironment } from './headless_dom_environment';

describe('WebGL stub', () => {
  it('gives getContext("webgl") a context that passes the checks MapLibre makes, and logs usage', () => {
    const env = createHeadlessDomEnvironment();
    try {
      const canvas = env.document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 100;
      const gl = canvas.getContext('webgl') as unknown as Record<
        string,
        (...a: unknown[]) => unknown
      > & {
        drawingBufferWidth: number;
        TRIANGLES: number;
      };
      expect(gl).not.toBeNull();
      expect(canvas.getContext('webgl')).toBe(gl);
      expect(canvas.getContext('webgl2')).toBeNull();
      expect(gl.drawingBufferWidth).toBe(200);
      expect(gl.getError()).toBe(0);
      expect(gl.isContextLost()).toBe(false);
      expect(gl.getShaderParameter({}, gl.COMPILE_STATUS)).toBe(true);
      expect(gl.getProgramParameter({}, gl.LINK_STATUS)).toBe(true);
      expect(gl.getParameter(gl.MAX_TEXTURE_SIZE)).toBe(8192);
      expect(gl.checkFramebufferStatus(gl.FRAMEBUFFER)).toBe(gl.FRAMEBUFFER_COMPLETE);
      expect(gl.createBuffer()).toEqual({});
      expect(typeof gl.TRIANGLES).toBe('number');
      // Unknown extensions are a harmless object, not null: MapLibre reads constants off them.
      expect(gl.getExtension('EXT_anything')).toBeTruthy();
      expect(env.usageLog.getEntries().map((e) => e.name)).toContain('webgl.createBuffer');
      // The skia backing still exists, so the host can paint a native render into it.
      expect(env.getBackingCanvas(canvas)).toMatchObject({ width: 200, height: 100 });
      expect(
        (env.window as unknown as { WebGLRenderingContext: unknown }).WebGLRenderingContext
      ).toBeDefined();
    } finally {
      env.dispose();
    }
  });
});
