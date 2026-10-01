/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JSDOM } from 'jsdom';
import { sanitizeWithInlinedStyles } from './inline_svg_styles';

describe('sanitizeWithInlinedStyles', () => {
  it('sanitizes the input without inlining when the pre-pass throws', () => {
    const { window } = new JSDOM('');
    jest.spyOn(window.DOMParser.prototype, 'parseFromString').mockImplementation(() => {
      throw new RangeError('Maximum call stack size exceeded');
    });
    const sanitize = jest.fn((svg: string) => `sanitized:${svg}`);
    const svg = '<svg><style>.a{fill:#f00}</style><rect class="a"/></svg>';

    expect(sanitizeWithInlinedStyles(svg, window, sanitize)).toBe(`sanitized:${svg}`);
    expect(sanitize).toHaveBeenCalledTimes(1);
  });

  it('walks large SVGs in linear time', () => {
    const { window } = new JSDOM('');
    const svg = `<svg><style>.a{fill:#f00}</style>${'<rect/>'.repeat(
      40_000
    )}<rect class="a"/></svg>`;
    const startedAt = Date.now();
    sanitizeWithInlinedStyles(svg, window, (input) => input);

    // A quadratic element walk takes well over ten seconds here. DOMPurify is left out so the linear
    // pre-pass is the only work timed.
    expect(Date.now() - startedAt).toBeLessThan(5000);
  });

  it('reads each element once however deeply referenced ids nest', () => {
    const { window } = new JSDOM('');
    const attributeReads = jest.spyOn(window.Element.prototype, 'attributes', 'get');
    const depth = 195;
    const references = Array.from({ length: depth }, (_, index) => `url(#g${index})`).join('');
    const groups = Array.from({ length: depth }, (_, index) => `<g id="g${index}">`).join('');
    const svg =
      `<svg><style>.a{clip-path:url(#g0)}</style><defs>${groups}<rect mask="${references}"/>` +
      `${'</g>'.repeat(depth)}</defs><rect class="a"/></svg>`;

    sanitizeWithInlinedStyles(svg, window, (input) => input);

    // Re-reading each nested subtree once per enclosing id grows with depth squared (about 38,000 reads).
    expect(attributeReads.mock.calls.length).toBeLessThan(5 * depth);
  });

  it('stops before sanitizing when a referenced element names too many ids', () => {
    const { window } = new JSDOM('');
    const sanitize = jest.fn((svg: string) => svg);
    const references = Array.from({ length: 1025 }, (_, index) => `url(#missing${index})`).join('');
    const svg =
      '<svg><defs><style>.a{clip-path:url(#clip)}</style>' +
      `<clipPath id="clip"><rect width="5" height="5" mask="${references}"/></clipPath>` +
      '</defs><rect class="a" width="9" height="9"/></svg>';

    sanitizeWithInlinedStyles(svg, window, sanitize);

    expect(sanitize).toHaveBeenCalledTimes(1);
    expect(sanitize).toHaveBeenCalledWith(svg);
  });
});
