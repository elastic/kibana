/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Router } from 'react-router-dom';
import { mount } from 'enzyme';
/* eslint-disable @kbn/eslint/module_migration */
import routeData from 'react-router';
/* eslint-enable @kbn/eslint/module_migration */
import { CaseComponent } from './';
import { caseProps, caseClosedProps, data, dataClosed } from './__mock__';
import { TestProviders } from '../../../../mock';
import { useUpdateCase } from '../../../../containers/case/use_update_case';
jest.mock('../../../../containers/case/use_update_case');
const useUpdateCaseMock = useUpdateCase as jest.Mock;
type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';
const location = {
  pathname: '/network',
  search: '',
  state: '',
  hash: '',
};
const mockHistory = {
  length: 2,
  location,
  action: pop,
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  block: jest.fn(),
  createHref: jest.fn(),
  listen: jest.fn(),
};

const mockLocation = {
  pathname: '/welcome',
  hash: '',
  search: '',
  state: '',
};

describe('CaseView ', () => {
  const updateCaseProperty = jest.fn();
  /* eslint-disable no-console */
  // Silence until enzyme fixed to use ReactTestUtils.act()
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });
  /* eslint-enable no-console */

  const defaultUpdateCaseState = {
    caseData: data,
    isLoading: false,
    isError: false,
    updateKey: null,
    updateCaseProperty,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    useUpdateCaseMock.mockImplementation(() => defaultUpdateCaseState);
    jest.spyOn(routeData, 'useLocation').mockReturnValue(mockLocation);
  });

  it('should render CaseComponent', () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
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
        .find(`[data-test-subj="case-view-status"]`)
        .first()
        .text()
    ).toEqual(data.status);
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
    expect(wrapper.contains(`[data-test-subj="case-view-closedAt"]`)).toBe(false);
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

  it('should show closed indicators in header when case is closed', () => {
    useUpdateCaseMock.mockImplementation(() => ({
      ...defaultUpdateCaseState,
      caseData: dataClosed,
    }));
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseClosedProps} />
        </Router>
      </TestProviders>
    );
    expect(wrapper.contains(`[data-test-subj="case-view-createdAt"]`)).toBe(false);
    expect(
      wrapper
        .find(`[data-test-subj="case-view-closedAt"]`)
        .first()
        .prop('value')
    ).toEqual(dataClosed.closedAt);
    expect(
      wrapper
        .find(`[data-test-subj="case-view-status"]`)
        .first()
        .text()
    ).toEqual(dataClosed.status);
  });

  it('should dispatch update state when button is toggled', () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );

    wrapper
      .find('input[data-test-subj="toggle-case-status"]')
      .simulate('change', { target: { checked: true } });

    expect(updateCaseProperty).toBeCalledWith({
      updateKey: 'status',
      updateValue: 'closed',
    });
  });

  it('should render comments', () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );
    expect(
      wrapper
        .find(
          `div[data-test-subj="user-action-${data.comments[0].id}-avatar"] [data-test-subj="user-action-avatar"]`
        )
        .first()
        .prop('name')
    ).toEqual(data.comments[0].createdBy.fullName);

    expect(
      wrapper
        .find(
          `div[data-test-subj="user-action-${data.comments[0].id}"] [data-test-subj="user-action-title"] strong`
        )
        .first()
        .text()
    ).toEqual(data.comments[0].createdBy.username);

    expect(
      wrapper
        .find(
          `div[data-test-subj="user-action-${data.comments[0].id}"] [data-test-subj="markdown"]`
        )
        .first()
        .prop('source')
    ).toEqual(data.comments[0].comment);
  });
});
