/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHeadlessDomEnvironment } from './headless_dom_environment';

const withPage = (
  css: string,
  html: string,
  run: (env: ReturnType<typeof createHeadlessDomEnvironment>) => void
) => {
  const env = createHeadlessDomEnvironment();
  try {
    const style = env.document.createElement('style');
    style.textContent = css;
    env.document.head.appendChild(style);
    // eslint-disable-next-line no-unsanitized/property
    env.document.body.innerHTML = html;
    run(env);
  } finally {
    env.dispose();
  }
};

describe('getComputedStyle', () => {
  it('applies specificity over source order, and order between equals', () => {
    withPage(
      '#i{padding-top:1px} .a{padding-top:2px} .a{padding-top:3px} div{padding-top:9px}',
      '<div id="i" class="a"></div><div id="j" class="a"></div>',
      (env) => {
        expect(env.window.getComputedStyle(env.document.getElementById('i')!).paddingTop).toBe(
          '1px'
        );
        expect(env.window.getComputedStyle(env.document.getElementById('j')!).paddingTop).toBe(
          '3px'
        );
      }
    );
  });

  it('honours !important and lets inline style beat normal rules but not !important ones', () => {
    withPage(
      '.a{color:red !important} .b{color:green}',
      '<div id="x" class="a" style="color:blue"></div><div id="y" class="b" style="color:blue"></div>',
      (env) => {
        expect(env.window.getComputedStyle(env.document.getElementById('x')!).color).toBe('red');
        expect(env.window.getComputedStyle(env.document.getElementById('y')!).color).toBe('blue');
      }
    );
  });

  it('resolves rem/em lengths and unitless line-height to px, inheriting the number', () => {
    withPage(
      'html{font-size:0.875rem;line-height:1.1428571428571428} .big{font-size:2em} .cell{padding:0.5rem 6px}',
      '<div id="a"><p id="b" class="big"><span id="c"></span></p></div><div id="d" class="cell"></div>',
      (env) => {
        const gcs = (id: string) => env.window.getComputedStyle(env.document.getElementById(id)!);
        // html is 0.875 * 16 = 14px; line-height 1.1428... * 14 = 16px.
        expect(parseFloat(gcs('a').fontSize)).toBeCloseTo(14, 3);
        expect(parseFloat(gcs('a').lineHeight)).toBeCloseTo(16, 2);
        // The unitless number inherits and is re-applied to the child's own font size.
        expect(parseFloat(gcs('b').fontSize)).toBeCloseTo(28, 3);
        expect(parseFloat(gcs('c').lineHeight)).toBeCloseTo(32, 2);
        // Shorthand expansion + rem to px (0.5rem of a 14px root = 7px).
        expect(gcs('d').paddingTop).toBe('7px');
        expect(gcs('d').paddingLeft).toBe('6px');
        expect(parseInt(gcs('d').lineHeight, 10)).toBe(16);
      }
    );
  });

  it('resolves var() through ancestors with fallbacks', () => {
    withPage(
      ':root{--gap:4px} .a{padding-top:var(--gap);padding-left:var(--nope, 9px)} .p{--gap:20px}',
      '<div id="x" class="a"></div><div class="p"><div id="y" class="a"></div></div>',
      (env) => {
        const gcs = (id: string) => env.window.getComputedStyle(env.document.getElementById(id)!);
        expect(gcs('x').paddingTop).toBe('4px');
        expect(gcs('x').paddingLeft).toBe('9px');
        expect(gcs('y').paddingTop).toBe('20px');
      }
    );
  });

  it('ignores :hover rules and @media print, and sees rules inserted later via insertRule', () => {
    withPage(
      '.a:hover{color:red} @media print{.a{color:green}} .a{color:blue}',
      '<div id="x" class="a"></div>',
      (env) => {
        const el = env.document.getElementById('x')!;
        expect(env.window.getComputedStyle(el).color).toBe('blue');
        const style = env.document.createElement('style');
        env.document.head.appendChild(style);
        style.sheet!.insertRule('.a{color:purple}', 0);
        expect(env.window.getComputedStyle(el).color).toBe('purple');
      }
    );
  });

  it('keeps EUI-style line-count row height math finite', () => {
    withPage(
      '.euiDataGridRowCell{font-size:0.875rem;line-height:1.1428571428571428} .euiDataGridRowCell__content{padding:6px}',
      '<div class="euiDataGridRowCell"><div id="c" class="euiDataGridRowCell__content"></div></div>',
      (env) => {
        const styles = env.window.getComputedStyle(env.document.getElementById('c')!);
        const lineHeight = parseInt(styles.lineHeight, 10);
        const padding = parseInt(styles.paddingTop, 10);
        expect(Math.ceil(1 * lineHeight) + padding * 2).toBe(28);
      }
    );
  });
});
