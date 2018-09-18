/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { __newPlatformInit__, banners } from './banners';

const newPlatformBanners = {
  add: jest.fn((...args) => ['add', args]),
  remove: jest.fn((...args) => ['remove', args]),
  replace: jest.fn((...args) => ['replace', args]),
};

__newPlatformInit__(newPlatformBanners);

beforeEach(() => {
  jest.clearAllMocks();
});

it('forwards calls to newPlatformBanners.add()', () => {
  expect(banners.add({ component: 'foo', priority: 10 })).toMatchInlineSnapshot(`
Array [
  "add",
  Array [
    [Function],
    10,
  ],
]
`);
});

it('forwards calls to newPlatformBanners.remove()', () => {
  expect(banners.remove('id')).toMatchInlineSnapshot(`
Array [
  "remove",
  Array [
    "id",
  ],
]
`);
});

it('forwards calls to newPlatformBanners.replace()', () => {
  expect(banners.set({ id: 'id', component: 'foo', priority: 100 })).toMatchInlineSnapshot(`
Array [
  "replace",
  Array [
    "id",
    [Function],
    100,
  ],
]
`);
});

describe('component is a react element', () => {
  it('renders with react, returns unrender function', () => {
    banners.add({ component: <span>foo</span> });
    const [[renderFn]] = newPlatformBanners.add.mock.calls;
    const div = document.createElement('div');
    const unrender = renderFn(div);
    expect(div).toMatchInlineSnapshot(`
<div>
  <span>
    foo
  </span>
</div>
`);
    unrender();
    expect(div).toMatchInlineSnapshot(`<div />`);
  });
});

describe('component is a string', () => {
  it('renders string with react, returns unrender function', () => {
    banners.add({ component: 'foo' });
    const [[renderFn]] = newPlatformBanners.add.mock.calls;
    const div = document.createElement('div');
    const unrender = renderFn(div);
    expect(div).toMatchInlineSnapshot(`
<div>
  foo
</div>
`);
    unrender();
    expect(div).toMatchInlineSnapshot(`<div />`);
  });
});
