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

import chrome from 'ui/chrome';
import disableAnimationsCss from '!!raw-loader!./disable_animations.css';

const uiSettings = chrome.getUiSettingsClient();

// rather than silently ignore when the style element is missing in the tests
// like ui/theme does, we automatically create a style tag because ordering doesn't
// really matter for these styles, they should really take top priority because
// they all use `!important`, and we don't want to silently ignore the possibility
// of accidentally removing the style element from the chrome template.
const styleElement = document.createElement('style');
styleElement.setAttribute('id', 'disableAnimationsCss');
document.head.appendChild(styleElement);

function updateStyleSheet() {
  styleElement.textContent = uiSettings.get('accessibility:disableAnimations')
    ? disableAnimationsCss
    : '';
}

updateStyleSheet();
uiSettings.getUpdate$().subscribe(({ key }) => {
  if (key === 'accessibility:disableAnimations') {
    updateStyleSheet();
  }
});

