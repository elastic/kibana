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

import { resolve } from 'path';
import { tmpdir } from 'os';
import { styleSheetPaths } from './style_sheet_paths';

const dir = tmpdir();
const pluginSpec = {
  getId: jest.fn(() => 'test'),
  getPublicDir: jest.fn(() => resolve(dir, 'kibana/public')),
};

expect.addSnapshotSerializer({
  test: value => typeof value === 'string' && value.startsWith(dir),
  print: value => value.replace(dir, '<absolute>'),
});

describe('uiExports.styleSheetPaths', () => {
  it('does not support relative paths', () => {
    expect(() => styleSheetPaths([], 'public/bar.css', 'styleSheetPaths', pluginSpec)).toThrowError(
      /\[plugin:test\] uiExports.styleSheetPaths must be an absolute path/
    );
  });

  it('path must be child of public path', () => {
    expect(() =>
      styleSheetPaths([], '/another/public/bar.css', 'styleSheetPaths', pluginSpec)
    ).toThrowError(/\[plugin:test\] uiExports.styleSheetPaths must be child of publicDir/);
  });

  it('only supports css or scss extensions', () => {
    expect(() =>
      styleSheetPaths([], '/kibana/public/bar.bad', 'styleSheetPaths', pluginSpec)
    ).toThrowError(
      '[plugin:test] uiExports.styleSheetPaths supported extensions [.css, .scss], got ".bad"'
    );
  });

  it('provides publicPath for scss extensions', () => {
    const localPath = resolve(dir, 'kibana/public/bar.scss');
    const uiExports = styleSheetPaths([], localPath, 'styleSheetPaths', pluginSpec);

    expect(uiExports.styleSheetPaths).toMatchInlineSnapshot(`
Array [
  Object {
    "localPath": <absolute>/kibana/public/bar.scss,
    "publicPath": "plugins/test/bar.light.css",
    "theme": "light",
  },
  Object {
    "localPath": <absolute>/kibana/public/bar.scss,
    "publicPath": "plugins/test/bar.dark.css",
    "theme": "dark",
  },
]
`);
  });

  it('provides publicPath for css extensions', () => {
    const localPath = resolve(dir, 'kibana/public/bar.scss');
    const uiExports = styleSheetPaths([], localPath, 'styleSheetPaths', pluginSpec);

    expect(uiExports.styleSheetPaths).toMatchInlineSnapshot(`
Array [
  Object {
    "localPath": <absolute>/kibana/public/bar.scss,
    "publicPath": "plugins/test/bar.light.css",
    "theme": "light",
  },
  Object {
    "localPath": <absolute>/kibana/public/bar.scss,
    "publicPath": "plugins/test/bar.dark.css",
    "theme": "dark",
  },
]
`);
  });

  it('should normalize mixed slashes', () => {
    const localPath = resolve(dir, 'kibana/public\\bar.scss');
    const uiExports = styleSheetPaths([], localPath, 'styleSheetPaths', pluginSpec);

    expect(uiExports.styleSheetPaths).toMatchInlineSnapshot(`
Array [
  Object {
    "localPath": <absolute>/kibana/public\\bar.scss,
    "publicPath": "plugins/test/../public/bar.light.css",
    "theme": "light",
  },
  Object {
    "localPath": <absolute>/kibana/public\\bar.scss,
    "publicPath": "plugins/test/../public/bar.dark.css",
    "theme": "dark",
  },
]
`);
  });
});
