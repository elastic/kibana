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

  it('should render CaseComponent', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseComponent {...caseProps} />
      </TestProviders>
    );
    expect(
      wrapper
        .find(`[data-test-subj="case-view-title"]`)
        .first()
        .prop('title')
    ).toEqual(data.title);
    expect(
      wrapper
        .find(`[data-test-subj="case-view-state"]`)
        .first()
        .text()
    ).toEqual(data.state);
    expect(
      wrapper
        .find(`[data-test-subj="case-view-tag-list"] .euiBadge__text`)
        .first()
        .text()
    ).toEqual(data.tags[0]);
    expect(
      wrapper
        .find(`[data-test-subj="case-view-username"]`)
        .first()
        .text()
    ).toEqual(data.createdBy.username);
    expect(
      wrapper
        .find(`[data-test-subj="case-view-createdAt"]`)
        .first()
        .prop('value')
    ).toEqual(data.createdAt);
    expect(
      wrapper
        .find(`[data-test-subj="case-view-description"]`)
        .first()
        .prop('raw')
    ).toEqual(data.description);
  });

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
