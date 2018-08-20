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

import $ from 'jquery';
import _ from 'lodash';

export const metadata = deepFreeze(getState());

function deepFreeze(object) {
  // for any properties that reference an object, makes sure that object is
  // recursively frozen as well
  Object.keys(object).forEach(key => {
    const value = object[key];
    if (_.isObject(value)) {
      deepFreeze(value);
    }
  });

  return Object.freeze(object);
}

function getState() {
  const stateKey = '__KBN__';
  if (!(stateKey in window)) {
    const state = $('kbn-initial-state').attr('data');
    window[stateKey] = JSON.parse(state);
  }
  return window[stateKey];
}
