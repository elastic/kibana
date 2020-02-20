/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { CaseComponent } from './';
import * as apiHook from '../../../../containers/case/use_update_case';
import { caseProps, data } from './__mock__';
import { TestProviders } from '../../../../mock';

describe('CaseView ', () => {
  const dispatchUpdateCaseProperty = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(apiHook, 'useUpdateCase').mockReturnValue([{ data }, dispatchUpdateCaseProperty]);
  });
  // TO DO fix tz issue in CI
  //   it('should render CaseComponent', () => {
  //     const wrapper = mount(
  //       <TestProviders>
  //         <CaseComponent {...caseProps} />
  //       </TestProviders>
  //     );
  //     expect(wrapper.find(CaseComponent)).toMatchSnapshot();
  //   });

  it('should dispatch update state when button is toggled', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseComponent {...caseProps} />
      </TestProviders>
    );

    wrapper
      .find('input[data-test-subj="toggle-case-state"]')
      .simulate('change', { target: { value: false } });

    expect(dispatchUpdateCaseProperty).toBeCalledWith({
      updateKey: 'state',
      updateValue: 'closed',
    });
  });
});
