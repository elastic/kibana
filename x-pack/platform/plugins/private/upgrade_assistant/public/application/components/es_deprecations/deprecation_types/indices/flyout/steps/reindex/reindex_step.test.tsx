/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';
import { LoadingState } from '../../../../../../types';
import type { ReindexState } from '../../../use_reindex';
import { ReindexFlyoutStep } from './reindex_step';
import { renderWithI18n } from '@kbn/test-jest-helpers';

jest.mock('../../../../../../../app_context', () => {
  const { docLinksServiceMock } = jest.requireActual('@kbn/core-doc-links-browser-mocks');

  return {
    useAppContext: () => {
      return {
        services: {
          api: {
            useLoadNodeDiskSpace: () => ({ data: [] }),
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
    closeFlyout: jest.fn(),
    startReindex: jest.fn(),
    cancelReindex: jest.fn(),
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
        isFollowerIndex: false,
      },
    } as ReindexState,
  };

  it('renders', () => {
    renderWithI18n(<ReindexFlyoutStep {...defaultProps} />);

    expect(screen.getByTestId('reindexChecklistTitle')).toHaveTextContent('Reindexing process');
    expect(screen.getByTestId('startReindexingButton')).toHaveTextContent('Start reindexing');
  });

  it('renders for frozen indices', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.meta.isFrozen = true;
    renderWithI18n(<ReindexFlyoutStep {...props} />);

    expect(screen.getByText('This index is frozen')).toBeInTheDocument();
  });

  it('disables button while reindexing', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.status = ReindexStatus.inProgress;
    renderWithI18n(<ReindexFlyoutStep {...props} />);
    expect(screen.getByTestId('startReindexingButton')).toBeDisabled();
    expect(screen.getByTestId('startReindexingButton')).toHaveTextContent('Reindexing…');
  });

  it('hides button if hasRequiredPrivileges is false', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.hasRequiredPrivileges = false;
    renderWithI18n(<ReindexFlyoutStep {...props} />);
    expect(screen.queryByTestId('startReindexingButton')).not.toBeInTheDocument();
  });

  it('hides button if has error', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.status = ReindexStatus.fetchFailed;
    props.reindexState.errorMessage = 'Index not found';
    renderWithI18n(<ReindexFlyoutStep {...props} />);
    expect(screen.queryByTestId('startReindexingButton')).not.toBeInTheDocument();
  });

  it('shows fetch failed error callout', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.status = ReindexStatus.fetchFailed;
    props.reindexState.errorMessage = 'Index not found';
    renderWithI18n(<ReindexFlyoutStep {...props} />);
    expect(screen.getByTestId('fetchFailedCallout')).toHaveTextContent('Index not found');
  });

  it('shows reindexing callout', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.status = ReindexStatus.failed;
    props.reindexState.errorMessage = 'Reindex failed';
    renderWithI18n(<ReindexFlyoutStep {...props} />);
    expect(screen.getByTestId('reindexingFailedCallout')).toHaveTextContent('Reindex failed');
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
    renderWithI18n(<ReindexFlyoutStep {...props} />);
    fireEvent.click(screen.getByTestId('startReindexingButton'));
    expect(props.startReindex).toHaveBeenCalled();
  });

  it('only shows read-only button when status is failed', () => {
    const statuses = [
      ReindexStatus.cancelled,
      ReindexStatus.completed,
      ReindexStatus.fetchFailed,
      ReindexStatus.inProgress,
      ReindexStatus.paused,
    ];

    statuses.forEach((status) => {
      const props = cloneDeep(defaultProps);
      props.reindexState.status = status;
      const { unmount } = renderWithI18n(<ReindexFlyoutStep {...props} />);
      expect(screen.queryByTestId('startIndexReadonlyButton')).not.toBeInTheDocument();
      unmount();
    });
  });

  it('does not show read-only button when the index is already read-only', () => {
    const props = cloneDeep(defaultProps);
    props.reindexState.status = ReindexStatus.failed;
    props.reindexState.errorMessage = 'Reindex failed';
    props.reindexState.meta.isReadonly = true;
    renderWithI18n(<ReindexFlyoutStep {...props} />);
    expect(screen.queryByTestId('startIndexReadonlyButton')).not.toBeInTheDocument();
  });

  it('does not show read-only button when read-only is excluded', () => {
    const props = {
      ...defaultProps,
      reindexState: {
        ...defaultProps.reindexState,
        status: ReindexStatus.failed,
        errorMessage: 'Reindex failed',
      },
    };
    renderWithI18n(<ReindexFlyoutStep {...props} />);
    expect(screen.queryByTestId('startIndexReadonlyButton')).not.toBeInTheDocument();
  });
});
