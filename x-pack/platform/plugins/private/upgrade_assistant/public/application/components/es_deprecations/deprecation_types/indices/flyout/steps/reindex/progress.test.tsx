/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { ReindexStep } from '@kbn/reindex-service-plugin/common';
import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';
import { LoadingState } from '../../../../../../types';
import type { ReindexState } from '../../../use_reindex';
import { ReindexProgress } from './progress';

describe('ReindexProgress', () => {
  it('renders', () => {
    renderWithI18n(
      <ReindexProgress
        reindexState={
          {
            lastCompletedStep: ReindexStep.created,
            status: ReindexStatus.inProgress,
            reindexTaskPercComplete: null,
            errorMessage: null,
            loadingState: LoadingState.Success,
            meta: {
              indexName: 'foo',
              reindexName: 'reindexed-foo',
              aliases: [],
              isFrozen: false,
              isReadonly: false,
              isInDataStream: false,
              isClosedIndex: false,
              isFollowerIndex: false,
            },
          } as ReindexState
        }
        cancelReindex={jest.fn()}
      />
    );

    expect(screen.getByTestId('reindexChecklistTitle')).toHaveTextContent(
      'Reindexing in progress… 0%'
    );

    const stepHeaders = screen.getAllByTestId('stepProgressStep');
    expect(stepHeaders).toHaveLength(6);

    expect(
      stepHeaders.some((step) => step.textContent?.includes('Setting foo index to read-only.'))
    ).toBe(true);
    expect(
      stepHeaders.some((step) => step.textContent?.includes('Create reindexed-foo index.'))
    ).toBe(true);
  });

  it('displays errors in the step that failed', () => {
    renderWithI18n(
      <ReindexProgress
        reindexState={
          {
            lastCompletedStep: ReindexStep.reindexCompleted,
            status: ReindexStatus.failed,
            reindexTaskPercComplete: 1,
            errorMessage: `This is an error that happened on alias switch`,
            loadingState: LoadingState.Success,
            meta: {
              indexName: 'foo',
              reindexName: 'reindexed-foo',
              aliases: [],
              isFrozen: true,
              isReadonly: false,
              isInDataStream: false,
              isClosedIndex: false,
              isFollowerIndex: false,
            },
          } as ReindexState
        }
        cancelReindex={jest.fn()}
      />
    );

    const stepHeaders = screen.getAllByTestId('stepProgressStep');
    const stepHeader = stepHeaders.find(
      (step) =>
        step.textContent?.includes('Copy original index settings from') === true &&
        step.textContent?.includes('reindexed-foo') === true
    );

    expect(stepHeader).toBeDefined();
    const stepContent = stepHeader!.nextElementSibling;
    expect(stepContent).not.toBeNull();
    expect(stepContent!).toHaveTextContent('There was an error');
    expect(stepContent!).toHaveTextContent('This is an error that happened on alias switch');
  });
});
