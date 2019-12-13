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

import { SelfChangingEditor } from './self_changing_editor';
import { SelfChangingComponent } from './self_changing_components';

import { setup as visualizations } from '../../../../../../src/legacy/core_plugins/visualizations/public/np_ready/public/legacy';


visualizations.types.createReactVisualization({
  name: 'self_changing_vis',
  title: 'Self Changing Vis',
  icon: 'visControls',
  description: 'This visualization is able to change its own settings, that you could also set in the editor.',
  visConfig: {
    component: SelfChangingComponent,
    defaults: {
      counter: 0,
    },
  },
  editorConfig: {
    optionTabs: [
      {
        name: 'options',
        title: 'Options',
        editor: SelfChangingEditor,
      },
    ],
  },
  requestHandler: 'none',
});
