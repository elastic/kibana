/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash';
import React from 'react';

import { ReindexStatus, ReindexWarning } from '../../../../../../../../../common/types';
import { LoadingState } from '../../../../../types';
import { ReindexState } from '../polling_service';
import { ChecklistFlyoutStep } from './checklist_step';

describe('ChecklistFlyout', () => {
  const defaultProps = {
    indexName: 'myIndex',
    closeFlyout: jest.fn(),
    confirmInputValue: 'CONFIRM',
    onConfirmInputChange: jest.fn(),
    startReindex: jest.fn(),
    cancelReindex: jest.fn(),
    http: {
      basePath: {
        prepend: jest.fn(),
      },
    } as any,
    reindexState: {
      loadingState: LoadingState.Success,
      lastCompletedStep: undefined,
      status: undefined,
      reindexTaskPercComplete: null,
      errorMessage: null,
      reindexWarnings: [ReindexWarning.allField],
      hasRequiredPrivileges: true,
    } as ReindexState,
  };

  it('renders', () => {
    expect(shallow(<ChecklistFlyoutStep {...defaultProps} />)).toMatchSnapshot();
  });

  it('disables button while reindexing', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.status = ReindexStatus.inProgress;
    const wrapper = shallow(<ChecklistFlyoutStep {...props} />);
    expect((wrapper.find('EuiButton').props() as any).isLoading).toBe(true);
  });

  it('disables button if hasRequiredPrivileges is false', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.hasRequiredPrivileges = false;
    const wrapper = shallow(<ChecklistFlyoutStep {...props} />);
    expect(wrapper.find('EuiButton').props().disabled).toBe(true);
  });

  it('calls startReindex when button is clicked', () => {
    const props = {
      ...defaultProps,
      reindexState: {
        ...defaultProps.reindexState,
        lastCompletedStep: undefined,
        status: undefined,
      },
    };
    const wrapper = shallow(<ChecklistFlyoutStep {...props} />);

    wrapper.find('EuiButton').simulate('click');
    expect(props.startReindex).toHaveBeenCalled();
  });
});
