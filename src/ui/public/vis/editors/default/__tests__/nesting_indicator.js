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

import expect from 'expect.js';
import ngMock from 'ng_mock';

describe('nestingIndicator directive', () => {
  let element;
  let $rootScope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((_$rootScope_, _$compile_) => {
    $rootScope = _$rootScope_;

    $rootScope.list = ['test'];
    $rootScope.item = 'test';
    element = _$compile_('<nesting-indicator item="item" list="list">')($rootScope);
  }));

  it('should update background color on list change', () => {
    $rootScope.list.push('test2');
    $rootScope.$digest();
    expect(element.find('span').length).to.equal(1);
  });

});
