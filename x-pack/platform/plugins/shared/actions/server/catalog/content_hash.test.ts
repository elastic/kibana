/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getContentHash, toIconDataUrl, validateSvgIcon } from './content_hash';

const SAFE_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/></svg>';

describe('getContentHash', () => {
  it('returns the sha256 of the exact bytes', () => {
    expect(getContentHash('hello')).toBe(
      'sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    );
  });
});

describe('validateSvgIcon', () => {
  it('accepts a simple svg', () => {
    expect(() => validateSvgIcon(SAFE_SVG)).not.toThrow();
    expect(toIconDataUrl(SAFE_SVG)).toContain('data:image/svg+xml;base64,');
  });

  it('rejects script, style, foreignObject, event handlers, and external references', () => {
    const rejected = [
      '<svg><script>alert(1)</script></svg>',
      '<svg><style>body{}</style></svg>',
      '<svg><foreignObject></foreignObject></svg>',
      '<svg onload="alert(1)"></svg>',
      '<svg><a href="https://evil.example">x</a></svg>',
      '<svg><rect fill="url(http://evil.example/x)" /></svg>',
    ];
    for (const svg of rejected) {
      expect(() => validateSvgIcon(svg)).toThrow(/unsupported active or external content/);
    }
  });
});
