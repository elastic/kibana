/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { validateSvgIcon } from './icon';

const shippedSvg = readFileSync(path.join(__dirname, 'specs', 'abuseipdb.svg'), 'utf8');

describe('validateSvgIcon', () => {
  it('accepts the shipped AbuseIPDB svg with same-document url(#e) and xlink:href="#a"', () => {
    expect(shippedSvg).toContain('url(#e)');
    expect(shippedSvg).toContain('xlink:href="#a"');
    expect(() => validateSvgIcon(shippedSvg)).not.toThrow();
  });

  it('rejects script tags', () => {
    expect(() =>
      validateSvgIcon('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    ).toThrow('unsupported active or external content');
  });

  it('rejects external href', () => {
    expect(() =>
      validateSvgIcon(
        '<svg xmlns="http://www.w3.org/2000/svg"><a href="https://evil.example">x</a></svg>'
      )
    ).toThrow('unsupported active or external content');
  });

  it('rejects external url() references', () => {
    expect(() =>
      validateSvgIcon(
        '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="url(http://evil.example/x)" /></svg>'
      )
    ).toThrow('unsupported active or external content');
  });
});
