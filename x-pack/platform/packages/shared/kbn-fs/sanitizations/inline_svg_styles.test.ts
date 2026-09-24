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
});
