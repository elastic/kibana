/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hoistStyles, withoutMasks } from './hoist_styles';

describe('hoistStyles', () => {
  it('moves each distinct <style> out of the markup, after the page’s own stylesheet', () => {
    const chart = `<div><style>.a{font-family:'Inter'}</style><i class="a"></i></div>`;
    expect(
      hoistStyles({ html: `<main>${chart}${chart}</main>`, css: '.page{}', width: 1 })
    ).toEqual({
      html: '<main><div><i class="a"></i></div><div><i class="a"></i></div></main>',
      css: ".page{}\n.a{font-family:'Inter'}",
      width: 1,
    });
  });

  it('leaves a page without one as it is', () => {
    const page = { html: '<main></main>', css: '' };
    expect(hoistStyles(page)).toBe(page);
  });
});

describe('withoutMasks', () => {
  it('drops mask-image declarations from the stylesheet and style attributes, and nothing else', () => {
    expect(
      withoutMasks({
        html: '<div style="mask-image:linear-gradient(red, blue);height:60px">a</div>',
        css: '.l{overflow:auto;-webkit-mask-image:linear-gradient(to bottom, red 7.5px, red calc(100% - 7.5px));mask-image:none}',
      })
    ).toEqual({ html: '<div style="height:60px">a</div>', css: '.l{overflow:auto;}' });
  });
});
