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

import { i18n } from '@kbn/i18n';
import _ from 'lodash';

function _toi18n(defaultString) {
  const id = _.camelCase(defaultString);
  return i18n.translate(`kbn.timeline.relativeOptions.${id}`, {
    defaultMessage: defaultString,
  });
}

export const relativeOptions = [
  { text: _toi18n('Seconds ago'), value: 's' },
  { text: _toi18n('Minutes ago'), value: 'm' },
  { text: _toi18n('Hours ago'), value: 'h' },
  { text: _toi18n('Days ago'), value: 'd' },
  { text: _toi18n('Weeks ago'), value: 'w' },
  { text: _toi18n('Months ago'), value: 'M' },
  { text: _toi18n('Years ago'), value: 'y' },

  { text: _toi18n('Seconds from now'), value: 's+' },
  { text: _toi18n('Minutes from now'), value: 'm+' },
  { text: _toi18n('Hours from now'), value: 'h+' },
  { text: _toi18n('Days from now'), value: 'd+' },
  { text: _toi18n('Weeks from now'), value: 'w+' },
  { text: _toi18n('Months from now'), value: 'M+' },
  { text: _toi18n('Years from now'), value: 'y+' },

];
