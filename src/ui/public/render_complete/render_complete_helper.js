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

const attributeName = 'data-render-complete';

export class RenderCompleteHelper {
  constructor(element) {
    this._element = element;
    this.setup();
  }

  _start = () => {
    this._element.setAttribute(attributeName, false);
    return true;
  };

  _complete = () => {
    this._element.setAttribute(attributeName, true);
    return true;
  };

  destroy = () => {
    this._element.removeEventListener('renderStart', this._start);
    this._element.removeEventListener('renderComplete', this._complete);
  };

  setup = () => {
    this._element.setAttribute(attributeName, false);
    this._element.addEventListener('renderStart', this._start);
    this._element.addEventListener('renderComplete', this._complete);
  };

  disable = () => {
    this._element.setAttribute(attributeName, 'disabled');
    this.teardown();
  };
}
