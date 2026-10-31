/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { componentsPack } from '@kbn/isomer-components';
import { studioConfig as config } from '.';

const guard = pathToFileURL(resolve(__dirname, 'no_image_backend.ts')).href;

describe('shared Isomer Studio', () => {
  it('registers the production pack without drawing capabilities', () => {
    expect(config.runtime.packs).toEqual([componentsPack]);
    expect(config.runtime.primitives).toEqual(componentsPack.primitives);
    expect(config.runtime.surfaces.snapshot).toBeUndefined();
    expect(config).not.toHaveProperty('imageFonts');
    expect(config).not.toHaveProperty('apps');
    expect(config.runtime.getCapabilities().formats).not.toContain('png');
    expect(config.runtime.getCapabilities().formats).not.toContain('pdf');
  });

  it('retains shared shadow-root style integration', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const context = config.createReactContext(root);
    expect(context.resolveClassName).toEqual(expect.any(Function));
  });

  it.each([
    '@elastic/isomer-image-takumi',
    '@elastic/isomer-image-other',
    '@takumi-rs/core',
    'pdfkit',
    'file:///tmp/node_modules/@elastic/isomer-image-takumi/dist/index.js',
  ])('blocks importing %s before backend resolution', (specifier) => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        guard,
        '--input-type=module',
        '-e',
        `await import(${JSON.stringify(specifier)})`,
      ],
      { encoding: 'utf8' }
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Isomer Studio does not allow image backends:');
  });

  it('allows ordinary modules with the guard installed', () => {
    const result = spawnSync(
      process.execPath,
      ['--import', guard, '--input-type=module', '-e', "await import('node:fs')"],
      { encoding: 'utf8' }
    );
    expect(result.status).toBe(0);
  });
});
