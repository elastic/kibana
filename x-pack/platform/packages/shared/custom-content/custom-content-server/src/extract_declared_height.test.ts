/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CUSTOM_CONTENT_DEFAULT_HEIGHT,
  CUSTOM_CONTENT_MIN_HEIGHT,
  CUSTOM_CONTENT_MAX_HEIGHT,
} from '@kbn/custom-content-common';
import { extractDeclaredHeight } from './extract_declared_height';

describe('extractDeclaredHeight', () => {
  it('reads the declared height and strips the declaration', () => {
    expect(extractDeclaredHeight('<!-- cc-height: 480 -->\n<div>hello</div>')).toEqual({
      height: 480,
      template: '<div>hello</div>',
    });
  });

  it('strips the arithmetic the model is asked to show after the number', () => {
    expect(
      extractDeclaredHeight('<!-- cc-height: 368 = 32 + 130 + 4x30 -->\n<div>hello</div>')
    ).toEqual({ height: 368, template: '<div>hello</div>' });
  });

  it('accepts the casing and spacing the model actually varies', () => {
    expect(extractDeclaredHeight('  <!--CC-Height:400-->  <div>hello</div>')).toEqual({
      height: 400,
      template: '<div>hello</div>',
    });
  });

  it('falls back to the default when nothing is declared', () => {
    expect(extractDeclaredHeight('<div>hello</div>')).toEqual({
      height: CUSTOM_CONTENT_DEFAULT_HEIGHT,
      template: '<div>hello</div>',
    });
  });

  it('leaves a declaration that is not the first thing in the template', () => {
    const template = '<div>hello</div>\n<!-- cc-height: 480 -->';

    expect(extractDeclaredHeight(template)).toEqual({
      height: CUSTOM_CONTENT_DEFAULT_HEIGHT,
      template,
    });
  });

  it('falls back when the declaration carries no number', () => {
    const template = '<!-- cc-height: tall -->\n<div>hello</div>';

    expect(extractDeclaredHeight(template)).toEqual({
      height: CUSTOM_CONTENT_DEFAULT_HEIGHT,
      template,
    });
  });

  // The value is model-authored, so it is clamped rather than trusted.
  it('clamps above the maximum', () => {
    expect(extractDeclaredHeight('<!-- cc-height: 99999 -->\n<div>hi</div>').height).toBe(
      CUSTOM_CONTENT_MAX_HEIGHT
    );
  });

  it('clamps below the minimum', () => {
    expect(extractDeclaredHeight('<!-- cc-height: 5 -->\n<div>hi</div>').height).toBe(
      CUSTOM_CONTENT_MIN_HEIGHT
    );
  });
});
