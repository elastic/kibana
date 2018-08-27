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

import { dirname, resolve } from 'path';
const ROOT = dirname(require.resolve('../../../package.json'));

export const UI_EXPORT_DEFAULTS = {
  webpackNoParseRules: [
    /node_modules[\/\\](angular|elasticsearch-browser)[\/\\]/,
    /node_modules[\/\\](mocha|moment)[\/\\]/
  ],

  webpackAliases: {
    ui: resolve(ROOT, 'src/ui/public'),
    '__kibanaCore__$': resolve(ROOT, 'src/core/public'),
    test_harness: resolve(ROOT, 'src/test_harness/public'),
    querystring: 'querystring-browser',
    moment$: resolve(ROOT, 'webpackShims/moment'),
    'moment-timezone$': resolve(ROOT, 'webpackShims/moment-timezone')
  },

  translationPaths: [],

  appExtensions: {
    fieldFormatEditors: [
      'ui/field_editor/components/field_format_editor/register'
    ],
    visRequestHandlers: [
      'ui/vis/request_handlers/courier',
      'ui/vis/request_handlers/none'
    ],
    visResponseHandlers: [
      'ui/vis/response_handlers/vislib',
      'ui/vis/response_handlers/none',
      'ui/vis/response_handlers/tabify',
      'ui/vis/response_handlers/legacy',
    ],
    visEditorTypes: [
      'ui/vis/editors/default/default',
    ],
    embeddableFactories: [
      'plugins/kibana/visualize/embeddable/visualize_embeddable_factory_provider',
      'plugins/kibana/discover/embeddable/search_embeddable_factory_provider',
    ],
    search: [
      'ui/courier/search_strategy/default_search_strategy',
    ],
  },
};
