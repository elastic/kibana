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

import { styleSheetPath } from './style_sheet_path';

describe('uiExports.styleSheetPath', () => {
  const pluginSpec = {
    getId: () => 'test',
    getPublicDir: () => '/kibana/public'
  };

  it('does not support relative paths', () => {
    expect(() => styleSheetPath([], 'public/bar.css', 'styleSheetPath', pluginSpec))
      .toThrowError('[plugin:test] uiExports.styleSheetPath must be an absolute path, got "public/bar.css"');
  });

  it('path must be child of public path', () => {
    expect(() => styleSheetPath([], '/another/public/bar.css', 'styleSheetPath', pluginSpec))
      .toThrowError('[plugin:test] uiExports.styleSheetPath must be child of publicDir [/kibana/public]');
  });

  it('only supports css or scss extensions', () => {
    expect(() => styleSheetPath([], '/kibana/public/bar.bad', 'styleSheetPath', pluginSpec))
      .toThrowError('[plugin:test] uiExports.styleSheetPath supported extensions [.css, .scss], got ".bad"');
  });

  it('provides publicPath for scss extensions', () => {
    const localPath = '/kibana/public/bar.scss';
    const { styleSheetPaths } = styleSheetPath([], localPath, 'styleSheetPath', pluginSpec);

    expect(styleSheetPaths).toHaveLength(1);
    expect(styleSheetPaths[0].localPath).toEqual(localPath);
    expect(styleSheetPaths[0].publicPath).toEqual('plugins/test/bar.css');
  });

  it('provides publicPath for css extensions', () => {
    const localPath = '/kibana/public/bar.css';
    const { styleSheetPaths } = styleSheetPath([], localPath, 'styleSheetPath', pluginSpec);

    expect(styleSheetPaths).toHaveLength(1);
    expect(styleSheetPaths[0].localPath).toEqual(localPath);
    expect(styleSheetPaths[0].publicPath).toEqual('plugins/test/bar.css');
  });
});