/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash';
import React from 'react';

import { ReindexStatus } from '../../../../../../../../../common/types';
import { LoadingState } from '../../../../../../types';
import type { ReindexState } from '../../../use_reindex';
import { ReindexFlyoutStep } from './reindex_step';

jest.mock('../../../../../../../app_context', () => {
  const { docLinksServiceMock } = jest.requireActual('@kbn/core-doc-links-browser-mocks');

  return {
    useAppContext: () => {
      return {
        services: {
          api: {
            useLoadNodeDiskSpace: () => [],
          },
          core: {
            docLinks: docLinksServiceMock.createStartContract(),
          },
        },
      };
    },
  };
});

describe('ReindexStep', () => {
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
    renderGlobalCallouts: jest.fn(),
    reindexState: {
      loadingState: LoadingState.Success,
      lastCompletedStep: undefined,
      status: undefined,
      reindexTaskPercComplete: null,
      errorMessage: null,
      reindexWarnings: [],
      hasRequiredPrivileges: true,
      meta: {
        indexName: 'myIndex',
        reindexName: 'reindexed-myIndex',
        aliases: [],
        isReadonly: false,
        isFrozen: false,
        isInDataStream: false,
        isClosedIndex: false,
      },
    } as ReindexState,
  };

  it('renders', () => {
    expect(shallow(<ReindexFlyoutStep {...defaultProps} />)).toMatchSnapshot();
  });

  it('renders for frozen indices', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.meta.isFrozen = true;
    expect(shallow(<ReindexFlyoutStep {...props} />)).toMatchSnapshot();
  });

  it('disables button while reindexing', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.status = ReindexStatus.inProgress;
    const wrapper = shallow(<ReindexFlyoutStep {...props} />);
    expect((wrapper.find('EuiButton').props() as any).isLoading).toBe(true);
  });

  it('hides button if hasRequiredPrivileges is false', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.hasRequiredPrivileges = false;
    const wrapper = shallow(<ReindexFlyoutStep {...props} />);
    expect(wrapper.exists('EuiButton')).toBe(false);
  });

  it('hides button if has error', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.status = ReindexStatus.fetchFailed;
    props.reindexState.errorMessage = 'Index not found';
    const wrapper = shallow(<ReindexFlyoutStep {...props} />);
    expect(wrapper.exists('EuiButton')).toBe(false);
  });

  it('shows fetch failed error callout', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.status = ReindexStatus.fetchFailed;
    props.reindexState.errorMessage = 'Index not found';
    const wrapper = shallow(<ReindexFlyoutStep {...props} />);
    expect(wrapper.find('FetchFailedCallOut').exists()).toBe(true);
    expect(wrapper.find('FetchFailedCallOut').props()).toEqual({
      errorMessage: 'Index not found',
    });
  });

  it('shows reindexing callout', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.status = ReindexStatus.failed;
    props.reindexState.errorMessage = 'Reindex failed';
    const wrapper = shallow(<ReindexFlyoutStep {...props} />);
    expect(wrapper.find('ReindexingFailedCallOut').exists()).toBe(true);
    expect(wrapper.find('ReindexingFailedCallOut').props()).toEqual({
      errorMessage: 'Reindex failed',
    });
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
    const wrapper = shallow(<ReindexFlyoutStep {...props} />);

    wrapper.find('EuiButton').simulate('click');
    expect(props.startReindex).toHaveBeenCalled();
  });
});
