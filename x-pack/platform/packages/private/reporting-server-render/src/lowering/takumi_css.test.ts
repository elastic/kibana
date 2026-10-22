/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHeadlessDomEnvironment } from '../worker/headless_dom_environment';
import { parseCss, parseInlineStyle, splitSelectorList } from './css_parser';
import {
  buildScopeIndex,
  lowerDeclarations,
  lowerInlineStyle,
  lowerInlineStyles,
  lowerInlineStylesFrom,
  lowerStylesheets,
  parseStylesheets,
} from './takumi_css';

describe('css_parser', () => {
  it('parses rules, at-rules and declarations, respecting strings, urls and comments', () => {
    const nodes = parseCss(`
      /* a comment; with { braces } */
      .a, .b:hover { color: red; background: url(data:image/png;base64,AA;BB) ; content: "a;b}" }
      @media screen and (min-width: 600px) { .c { width: 10px !important } }
      @font-face { font-family: X; src: url(x.woff2) }
      @layer base, theme;
    `);
    expect(nodes).toHaveLength(4);
    expect(nodes[0]).toMatchObject({
      type: 'rule',
      selector: '.a, .b:hover',
      declarations: [
        { prop: 'color', value: 'red' },
        { prop: 'background', value: 'url(data:image/png;base64,AA;BB)' },
        { prop: 'content', value: '"a;b}"' },
      ],
    });
    expect(nodes[1]).toMatchObject({
      type: 'atrule',
      name: 'media',
      rules: [{ type: 'rule', declarations: [{ prop: 'width', value: '10px', important: true }] }],
    });
    expect(nodes[2]).toMatchObject({
      name: 'font-face',
      declarations: [{ prop: 'font-family' }, { prop: 'src' }],
    });
    expect(nodes[3]).toMatchObject({ name: 'layer', params: 'base, theme' });
  });

  it('skips nested rules and junk instead of throwing', () => {
    expect(() => parseCss('.a{color:red;& b{color:blue}} }}} .c{')).not.toThrow();
    const [rule] = parseCss('.a{color:red;& b{color:blue};width:1px}');
    expect((rule as { declarations: unknown[] }).declarations).toHaveLength(2);
  });

  it('contains an unbalanced paren to its own declaration instead of swallowing the sheet', () => {
    const nodes = parseCss(
      '.a{display:grid;grid-template-columns:repeat(1, minmax(0, 1fr)} .b{color:red}'
    );
    expect(nodes).toHaveLength(2);
    expect(nodes[1]).toMatchObject({
      selector: '.b',
      declarations: [{ prop: 'color', value: 'red' }],
    });
  });

  it('splits selector lists only at top-level commas', () => {
    expect(splitSelectorList('.a, .b:is(.c, .d), [x="a,b"]')).toEqual([
      '.a',
      '.b:is(.c, .d)',
      '[x="a,b"]',
    ]);
  });

  it('parses inline style text', () => {
    expect(parseInlineStyle('color: red; width: calc(1px + 2px)')).toEqual([
      { prop: 'color', value: 'red', important: false },
      { prop: 'width', value: 'calc(1px + 2px)', important: false },
    ]);
  });
});

describe('lowerDeclarations', () => {
  const lower = (css: string) =>
    lowerDeclarations(parseInlineStyle(css)).map((d) => `${d.prop}:${d.value}`);

  it.each([
    ['overflow: auto', ['overflow:hidden']],
    ['overflow-y: scroll', ['overflow-y:hidden']],
    ['overflow: hidden auto', ['overflow:hidden hidden']],
    ['position: sticky', ['position:relative']],
    ['display: contents', []],
    ['width: -webkit-fill-available', ['width:100%']],
    ['min-width: fit-content', []],
    ['max-width: max-content', []],
    ['grid-template-rows: min-content auto', []],
    [
      'grid-template-columns: repeat(2, minmax(0, 1fr))',
      ['grid-template-columns:repeat(2, minmax(0, 1fr))'],
    ],
    ['grid-template-columns: minmax(80px, 1fr)', ['grid-template-columns:minmax(80px, 1fr)']],
    [
      'grid-template-columns: repeat(auto-fill, minmax(100px, 1fr))',
      ['grid-template-columns:repeat(auto-fill, minmax(100px, 1fr))'],
    ],
    ['align-self: auto', []],
    ['white-space: break-spaces', ['white-space:pre-wrap']],
    ['height: env(safe-area-inset-top)', []],
    ['cursor: pointer; transition: all 1s; animation: x 1s; will-change: transform', []],
    ['color: red', ['color:red']],
  ])('%s', (input, expected) => {
    expect(lower(input)).toEqual(expected);
  });

  it('maps logical properties to physical ones, including two-sided shorthands', () => {
    expect(lower('inline-size: 10px; block-size: 5px; border-inline-start: 1px solid red')).toEqual(
      ['width:10px', 'height:5px', 'border-left:1px solid red']
    );
    expect(lower('padding-block: 4px 8px; margin-inline: 2px; inset-inline: 0')).toEqual([
      'padding-top:4px',
      'padding-bottom:8px',
      'margin-left:2px',
      'margin-right:2px',
      'left:0',
      'right:0',
    ]);
  });

  it('repairs the unbalanced parens jsdom serializes (`repeat(1, minmax(0, 1fr)`)', () => {
    expect(lower('grid-template-columns: repeat(1, minmax(0, 1fr)')).toEqual([
      'grid-template-columns:repeat(1, minmax(0, 1fr))',
    ]);
  });

  it('keeps !important', () => {
    const [declaration] = lowerDeclarations(parseInlineStyle('overflow: auto !important'));
    expect(declaration).toEqual({ prop: 'overflow', value: 'hidden', important: true });
  });
});

describe('lowerInlineStyles', () => {
  it('rewrites style attributes in place and removes ones that lower to nothing', () => {
    const env = createHeadlessDomEnvironment();
    try {
      env.document.body.innerHTML =
        '<div id="r" style="overflow:auto"><span id="a" style="cursor:pointer"></span><b id="b" style="color:red"></b></div>';
      const root = env.document.getElementById('r')!;
      lowerInlineStyles(root);
      expect(root.getAttribute('style')).toBe('overflow:hidden');
      expect(env.document.getElementById('a')!.hasAttribute('style')).toBe(false);
      expect(env.document.getElementById('b')!.getAttribute('style')).toBe('color:red');
      expect(lowerInlineStyle('')).toBe('');
    } finally {
      env.dispose();
    }
  });
});

describe('lowerInlineStylesFrom', () => {
  it('keeps declarations after a value whose closing paren is missing', () => {
    const env = createHeadlessDomEnvironment();
    try {
      env.document.body.innerHTML = '<div id="a"><span id="b"></span></div>';
      const original = env.document.getElementById('a')!;
      // As Elastic Charts' metric grid sets it: the closing paren is missing.
      (original as HTMLElement).style.setProperty(
        'grid-template-columns',
        'repeat(1, minmax(0, 1fr)'
      );
      (original as HTMLElement).style.setProperty('overflow', 'auto');
      (original.firstElementChild as HTMLElement).style.setProperty('color', 'red');
      const clone = original.cloneNode(true) as Element;

      lowerInlineStylesFrom(original, clone);

      const style = clone.getAttribute('style')!;
      expect(style).toContain('grid-template-columns:repeat(1, minmax(0, 1fr))');
      expect(style).toContain('overflow:hidden');
      expect(clone.firstElementChild!.getAttribute('style')).toBe('color:red');
    } finally {
      env.dispose();
    }
  });
});

describe('lowerStylesheets', () => {
  const lowerFor = (html: string, ...sheets: string[]) => {
    const env = createHeadlessDomEnvironment();
    try {
      // eslint-disable-next-line no-unsanitized/property
      env.document.body.innerHTML = `<div id="root">${html}</div>`;
      const scope = buildScopeIndex(env.document.getElementById('root')!);
      return lowerStylesheets(parseStylesheets(sheets), scope).css;
    } finally {
      env.dispose();
    }
  };

  it('prunes rules whose class or id cannot match the panel, keeping ones that can', () => {
    const css = lowerFor(
      '<div class="used"></div>',
      '.used{color:red} .unused{color:blue} #nope{color:green} .used .other{color:pink}'
    );
    expect(css).toContain('.used{color:red}');
    expect(css).not.toContain('.unused');
    expect(css).not.toContain('#nope');
    expect(css).not.toContain('.other');
  });

  it('drops hover/focus/vendor-pseudo selectors and print media; keeps screen media and layers', () => {
    const css = lowerFor(
      '<div class="a"></div>',
      `.a:hover{color:red} .a::-webkit-scrollbar{width:0} .a,.a:focus{color:blue}
       @media print{.a{color:green}} @media screen{.a{width:1px}} @layer base{.a{height:1px}}`
    );
    expect(css).not.toContain('hover');
    expect(css).not.toContain('scrollbar');
    expect(css).not.toContain('focus');
    expect(css).toContain('.a{color:blue}');
    expect(css).not.toContain('green');
    expect(css).toContain('@media screen');
    expect(css).toContain('@layer base');
  });

  it('drops font-face/keyframes, lowers declarations, and keeps :root custom properties', () => {
    const css = lowerFor(
      '<div class="a"></div>',
      `@font-face{font-family:X;src:url(x)} @keyframes k{from{opacity:0}} :root{--x:4px} .a{overflow:auto;inline-size:var(--x)}`
    );
    expect(css).not.toContain('font-face');
    expect(css).not.toContain('keyframes');
    expect(css).toContain(':root{--x:4px}');
    expect(css).toContain('overflow:hidden');
    expect(css).toContain('width:var(--x)');
  });

  it('evaluates tag-only selectors against the markup', () => {
    const css = lowerFor('<h2>t</h2>', 'h2{font-size:20px} table{color:red} p{color:blue}');
    expect(css).toContain('h2{font-size:20px}');
    expect(css).not.toContain('table');
    expect(css).not.toContain('p{');
  });

  it('keeps sheet order so the cascade tiebreak is unchanged', () => {
    const css = lowerFor('<div class="a"></div>', '.a{color:red}', '.a{color:blue}');
    expect(css.indexOf('red')).toBeLessThan(css.indexOf('blue'));
  });
});
