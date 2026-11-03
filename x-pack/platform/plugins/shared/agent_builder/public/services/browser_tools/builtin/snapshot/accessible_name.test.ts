/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { accessibleName } from './accessible_name';

const render = (html: string): HTMLElement => {
  const root = document.createElement('div');
  // eslint-disable-next-line no-unsanitized/property -- static test fixture markup
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
};

describe('accessibleName', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses aria-label first', () => {
    const root = render(`<button aria-label=" Close  me " title="t">X</button>`);
    expect(accessibleName(root.querySelector('button')!)).toBe('Close me');
  });

  it('joins aria-labelledby targets', () => {
    const root = render(
      `<span id="a">Hello</span><span id="b">world</span><div aria-labelledby="a b" title="t"></div>`
    );
    expect(accessibleName(root.querySelector('div')!)).toBe('Hello world');
  });

  it('uses label[for] and wrapping labels', () => {
    const root = render(
      `<label for="x">Name</label><input id="x" placeholder="p" />
       <label>Email <input id="y" /></label>`
    );
    expect(accessibleName(root.querySelector('#x')!)).toBe('Name');
    expect(accessibleName(root.querySelector('#y')!)).toBe('Email');
  });

  it('falls back to placeholder, title, alt, then text', () => {
    const root = render(
      `<input id="p" placeholder="Search" title="t" />
       <span id="t" title="Tip">text</span>
       <img id="i" alt="Logo" />
       <a id="a" href="#">  Go
         home </a>`
    );
    expect(accessibleName(root.querySelector('#p')!)).toBe('Search');
    expect(accessibleName(root.querySelector('#t')!)).toBe('Tip');
    expect(accessibleName(root.querySelector('#i')!)).toBe('Logo');
    expect(accessibleName(root.querySelector('#a')!)).toBe('Go home');
  });

  it('uses the value of button-like inputs', () => {
    const root = render(`<input type="submit" value="Go" /><input type="text" value="typed" />`);
    expect(accessibleName(root.querySelector('[type=submit]')!)).toBe('Go');
    expect(accessibleName(root.querySelector('[type=text]')!)).toBe('');
  });

  it('names svg elements from their title child', () => {
    const root = render(`<svg><title>Chart</title><circle /></svg>`);
    expect(accessibleName(root.querySelector('svg')!, { fromContent: false })).toBe('Chart');
  });

  it('ignores text content when fromContent is false', () => {
    const root = render(`<main>Lots of text</main>`);
    expect(accessibleName(root.querySelector('main')!, { fromContent: false })).toBe('');
  });

  it('caps names at 80 characters with an ellipsis', () => {
    const root = render(`<button>${'y'.repeat(100)}</button>`);
    const name = accessibleName(root.querySelector('button')!);
    expect(name).toHaveLength(80);
    expect(name.endsWith('…')).toBe(true);
  });

  it('returns an empty string when nothing applies', () => {
    const root = render(`<div></div>`);
    expect(accessibleName(root.querySelector('div')!)).toBe('');
  });
});
