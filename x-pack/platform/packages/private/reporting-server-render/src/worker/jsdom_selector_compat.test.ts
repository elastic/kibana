/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JSDOM } from 'jsdom';
import { installSelectorEngine } from './jsdom_selector_compat';

describe('installSelectorEngine', () => {
  const makeDom = () =>
    new JSDOM(
      `<!doctype html><html><body>
        <div class="a"><span data-test-subj="hi">hello</span></div>
        <div class="b"><span data-test-subj="bye">bye</span></div>
      </body></html>`,
      { url: 'http://localhost:5601/bundles/' }
    );

  it('resolves querySelector/querySelectorAll on Document and Element', () => {
    const dom = makeDom();
    installSelectorEngine(dom.window);

    const single = dom.window.document.querySelector('.a span[data-test-subj]');
    expect(single?.textContent).toBe('hello');

    const all = dom.window.document.querySelectorAll('span[data-test-subj]');
    expect(Array.from(all).map((el) => el.textContent)).toEqual(['hello', 'bye']);

    const scoped = dom.window.document.querySelector('.b')?.querySelector('span[data-test-subj]');
    expect(scoped?.textContent).toBe('bye');
  });

  it('resolves matches() and closest()', () => {
    const dom = makeDom();
    installSelectorEngine(dom.window);

    const span = dom.window.document.querySelector('.a span') as Element;
    expect(span.matches('[data-test-subj="hi"]')).toBe(true);
    expect(span.matches('[data-test-subj="bye"]')).toBe(false);
    expect(span.closest('.a')?.className).toBe('a');
    expect(span.closest('.nonexistent')).toBeNull();
  });

  it('returns null/empty results for selectors with no match, without throwing', () => {
    const dom = makeDom();
    installSelectorEngine(dom.window);

    expect(dom.window.document.querySelector('.nope')).toBeNull();
    expect(dom.window.document.querySelectorAll('.nope')).toHaveLength(0);
  });
});
