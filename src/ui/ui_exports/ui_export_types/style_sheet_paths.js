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

import path from 'path';
import { flatConcatAtType } from './reduce';
import { mapSpec, wrap } from './modify_reduce';

const OK_EXTNAMES = ['.css', '.scss'];

function normalize(localPath, type, pluginSpec) {
  const pluginId = pluginSpec.getId();
  const publicDir = path.normalize(pluginSpec.getPublicDir());
  const extname = path.extname(localPath);

  if (!OK_EXTNAMES.includes(extname)) {
    throw new Error(
      `[plugin:${pluginId}] uiExports.styleSheetPaths supported extensions [${OK_EXTNAMES.join(', ')}], got "${extname}"`
    );
  }

  if (!path.isAbsolute(localPath)) {
    throw new Error(
      `[plugin:${pluginId}] uiExports.styleSheetPaths must be an absolute path, got "${localPath}"`
    );
  }

  if (!path.normalize(localPath).startsWith(publicDir)) {
    throw new Error(
      `[plugin:${pluginId}] uiExports.styleSheetPaths must be child of publicDir [${publicDir}]`
    );
  }

  // get the path of the stylesheet relative to the public dir for the plugin
  let relativePath = path.relative(publicDir, localPath);

  // replace back slashes on windows
  relativePath = relativePath.split('\\').join('/');

  // replace the extension of relativePath to be .css
  // publicPath will always point to the css file
  relativePath = relativePath.slice(0, -extname.length) + '.css';

  const publicPath = `plugins/${pluginSpec.getId()}/${relativePath}`;

  return {
    localPath,
    publicPath
  };
}

export const styleSheetPaths = wrap(mapSpec(normalize), flatConcatAtType);