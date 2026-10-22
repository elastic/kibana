/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Image as NativeImage } from '@napi-rs/canvas';
import { loadImage } from '@napi-rs/canvas';
import type { ShimUsageLog } from './shim_usage_log';

/**
 * jsdom never loads an `<img>`: with no `canvas` package it fires neither `load` nor
 * `error`, and reports 0x0. Code that waits for `img.onload` (the maps plugin decodes the EMS
 * basemap's sprite sheet with `new Image()` + `drawImage` + `getImageData`) therefore waits
 * forever, and the layer never reaches the style.
 *
 * This decodes the bytes with skia: `src` is resolved (data:, loopback, or an allow-listed
 * origin, through `fetchBytes`), the decoded image backs `naturalWidth/Height`/`complete`, and
 * `load`/`error` fire. {@link unwrapDrawable} lets a wrapped 2D context's `drawImage` accept
 * such an element.
 */
const decoded = new WeakMap<object, NativeImage>();

export const getDecodedImage = (image: unknown): NativeImage | undefined =>
  decoded.get(image as object);

export const installImageLoaderShim = (
  window: {
    HTMLImageElement: { prototype: HTMLImageElement };
    location: { href: string };
    Event: typeof Event;
  },
  { fetchBytes, usageLog }: { fetchBytes: (url: string) => Promise<Buffer>; usageLog: ShimUsageLog }
): void => {
  const proto = window.HTMLImageElement.prototype;
  const originalSrc = Object.getOwnPropertyDescriptor(proto, 'src');

  const load = async (image: HTMLImageElement, rawSrc: string) => {
    try {
      let bytes: Buffer;
      if (rawSrc.startsWith('data:')) {
        const comma = rawSrc.indexOf(',');
        const meta = rawSrc.slice(5, comma);
        const payload = rawSrc.slice(comma + 1);
        bytes = meta.includes(';base64')
          ? Buffer.from(payload, 'base64')
          : Buffer.from(decodeURIComponent(payload));
      } else {
        bytes = await fetchBytes(new URL(rawSrc, window.location.href).toString());
      }
      decoded.set(image, await loadImage(bytes));
      usageLog.record('image.loaded', rawSrc.startsWith('data:') ? 'data:' : rawSrc);
      image.dispatchEvent(new window.Event('load'));
    } catch (error) {
      usageLog.record('image.failed', `${rawSrc.slice(0, 120)}: ${String(error).slice(0, 120)}`);
      image.dispatchEvent(new window.Event('error'));
    }
  };

  Object.defineProperty(proto, 'src', {
    configurable: true,
    enumerable: true,
    get(this: HTMLImageElement) {
      return originalSrc?.get ? originalSrc.get.call(this) : this.getAttribute('src') ?? '';
    },
    set(this: HTMLImageElement, value: string) {
      originalSrc?.set?.call(this, value);
      decoded.delete(this);
      if (value) void load(this, String(value));
    },
  });

  const sizeOf = (image: HTMLImageElement, prop: 'width' | 'height') => {
    const native = decoded.get(image);
    return native ? native[prop] : 0;
  };
  for (const prop of ['naturalWidth', 'naturalHeight'] as const) {
    Object.defineProperty(proto, prop, {
      configurable: true,
      get(this: HTMLImageElement) {
        return sizeOf(this, prop === 'naturalWidth' ? 'width' : 'height');
      },
    });
  }
  Object.defineProperty(proto, 'complete', {
    configurable: true,
    get(this: HTMLImageElement) {
      return decoded.has(this) || !this.getAttribute('src');
    },
  });
  for (const prop of ['width', 'height'] as const) {
    const original = Object.getOwnPropertyDescriptor(proto, prop);
    Object.defineProperty(proto, prop, {
      configurable: true,
      get(this: HTMLImageElement) {
        const attribute = parseInt(this.getAttribute(prop) ?? '', 10);
        return Number.isFinite(attribute) ? attribute : sizeOf(this, prop);
      },
      set(this: HTMLImageElement, value: number) {
        original?.set?.call(this, value);
      },
    });
  }
  (proto as unknown as { decode: () => Promise<void> }).decode = function decode() {
    return Promise.resolve();
  };
};

/**
 * What a skia 2D context's `drawImage`/`createPattern` can take for an element jsdom
 * understands: a decoded `<img>`, or a `<canvas>`'s backing surface (`getBacking`).
 */
export const unwrapDrawable = (
  drawable: unknown,
  getBacking: (canvas: unknown) => unknown
): unknown => {
  const image = decoded.get(drawable as object);
  if (image) return image;
  const backing = getBacking(drawable);
  return backing ?? drawable;
};
