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

import React from 'react';
import { shallow } from 'enzyme';
import { Chrome } from 'ui/chrome';
import { AlertsList, NoAlerts } from './alerts_list';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';
import { listBreadcrumb } from '../../../lib/breadcrumbs';

describe('Alerts List', () => {
  it.skip('should set the breadcrumbs', () => {
    /*
      TODO: Seems useEffect isn't being triggered by shallow render, look into why before a PR is submitted
       */
    const mockBreadcrumbs: Chrome['breadcrumbs'] = {
      get$: jest.fn(),
      set: jest.fn(),
      push: jest.fn(),
      filter: jest.fn(),
      pop: jest.fn(),
    };

    shallow(<AlertsList breadcrumbs={mockBreadcrumbs} />);

    expect(mockBreadcrumbs.set).toHaveBeenLastCalledWith([MANAGEMENT_BREADCRUMB, listBreadcrumb]);
  });

  it('should prompt for NoAlerts when there are none available', () => {
    const comp = shallow(<AlertsList />);
    expect(comp.contains(<NoAlerts />)).toBeTruthy();
  });
});

describe('Alerts List: Empty List', () => {
  it('should render an Empty Prompt', () => {
    const comp = shallow(<NoAlerts />);
    expect(comp).toMatchSnapshot();
  });
});
