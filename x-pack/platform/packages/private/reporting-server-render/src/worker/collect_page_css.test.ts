/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHeadlessDomEnvironment } from './headless_dom_environment';
import { collectPageCss } from './collect_page_css';

describe('collectPageCss', () => {
  it('captures rules inserted with insertRule (speedy Emotion), whose <style> text stays empty', () => {
    const env = createHeadlessDomEnvironment();
    try {
      const style = env.document.createElement('style');
      style.setAttribute('data-emotion', 'css');
      env.document.head.appendChild(style);
      const sheet = style.sheet!;
      sheet.insertRule('.a{color:red}', 0);
      sheet.insertRule('.b{color:blue}', 1);
      sheet.insertRule('.first{color:green}', 0);

      expect(style.textContent).toBe('');
      const [collected] = collectPageCss(env);
      expect(collected.source).toBe('emotion:css');
      expect(collected.css.split('\n')).toEqual([
        '.first{color:green}',
        '.a{color:red}',
        '.b{color:blue}',
      ]);
    } finally {
      env.dispose();
    }
  });

  it('keeps rule text cssom would reject, and honours deleteRule', () => {
    const env = createHeadlessDomEnvironment();
    try {
      const style = env.document.createElement('style');
      env.document.head.appendChild(style);
      const sheet = style.sheet!;
      sheet.insertRule('.keep{color:red}', 0);
      sheet.insertRule('.drop{color:blue}', 1);
      sheet.deleteRule(1);
      try {
        sheet.insertRule('.a:is(.b,.c){color:red}', 1);
      } catch {
        // cssom may reject syntax a real browser accepts; the recorder must still have it.
      }

      const [collected] = collectPageCss(env);
      expect(collected.css).toContain('.keep{color:red}');
      expect(collected.css).not.toContain('.drop');
      expect(collected.css).toContain(':is(.b,.c)');
    } finally {
      env.dispose();
    }
  });

  it('collects <style> text and <link> bodies in document order', () => {
    const env = createHeadlessDomEnvironment();
    try {
      env.document.head.innerHTML =
        '<style>.one{color:red}</style><link rel="stylesheet" href="http://localhost/a.css"><style>.two{color:blue}</style>';
      const bodies: Record<string, string> = { 'http://localhost/a.css': '.linked{color:green}' };

      const sheets = collectPageCss({
        document: env.document,
        getFetchedStylesheet: (url) => bodies[url],
      });

      expect(sheets.map((s) => s.css)).toEqual([
        '.one{color:red}',
        '.linked{color:green}',
        '.two{color:blue}',
      ]);
    } finally {
      env.dispose();
    }
  });
});
