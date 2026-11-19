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
import { ReindexProgress } from './progress';
import { createReindexState } from '../../../../test_utils/helpers';

describe('ReindexProgress', () => {
  it('renders', () => {
    renderWithI18n(
      <ReindexProgress
        reindexState={{
          ...createReindexState({
            loadingState: LoadingState.Success,
            meta: {
              ...createReindexState().meta,
              indexName: 'foo',
              reindexName: 'reindexed-foo',
              aliases: [],
            },
          }),
          lastCompletedStep: ReindexStep.created,
          status: ReindexStatus.inProgress,
          reindexTaskPercComplete: null,
          errorMessage: null,
        }}
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
        reindexState={{
          ...createReindexState({
            loadingState: LoadingState.Success,
            meta: {
              ...createReindexState().meta,
              indexName: 'foo',
              reindexName: 'reindexed-foo',
              aliases: [],
              isFrozen: true,
            },
          }),
          lastCompletedStep: ReindexStep.reindexCompleted,
          status: ReindexStatus.failed,
          reindexTaskPercComplete: 1,
          errorMessage: `This is an error that happened on alias switch`,
        }}
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

  it('has started but not yet reindexing documents', () => {
    renderWithI18n(
      <ReindexProgress
        reindexState={{
          ...createReindexState({
            loadingState: LoadingState.Success,
            meta: {
              ...createReindexState().meta,
              indexName: 'foo',
              reindexName: 'reindexed-foo',
              aliases: [],
            },
          }),
          lastCompletedStep: ReindexStep.readonly,
          status: ReindexStatus.inProgress,
          reindexTaskPercComplete: null,
        }}
        cancelReindex={jest.fn()}
      />
    );

    expect(screen.getByTestId('reindexChecklistTitle')).toHaveTextContent(
      'Reindexing in progress… 5%'
    );
    expect(screen.queryByTestId('cancelReindexingDocumentsButton')).toBeNull();
  });

  it('has started reindexing documents', () => {
    renderWithI18n(
      <ReindexProgress
        reindexState={{
          ...createReindexState({
            loadingState: LoadingState.Success,
            meta: {
              ...createReindexState().meta,
              indexName: 'foo',
              reindexName: 'reindexed-foo',
              aliases: [],
            },
          }),
          lastCompletedStep: ReindexStep.reindexStarted,
          status: ReindexStatus.inProgress,
          reindexTaskPercComplete: 0.25,
        }}
        cancelReindex={jest.fn()}
      />
    );

    expect(screen.getByTestId('reindexChecklistTitle')).toHaveTextContent(
      'Reindexing in progress… 30%'
    );
    expect(screen.getByTestId('cancelReindexingDocumentsButton')).toBeInTheDocument();
  });

  it('has completed reindexing documents', () => {
    renderWithI18n(
      <ReindexProgress
        reindexState={{
          ...createReindexState({
            loadingState: LoadingState.Success,
            meta: {
              ...createReindexState().meta,
              indexName: 'foo',
              reindexName: 'reindexed-foo',
              aliases: [],
            },
          }),
          lastCompletedStep: ReindexStep.reindexCompleted,
          status: ReindexStatus.inProgress,
          reindexTaskPercComplete: 1,
        }}
        cancelReindex={jest.fn()}
      />
    );

    expect(screen.getByTestId('reindexChecklistTitle')).toHaveTextContent(
      'Reindexing in progress… 90%'
    );
    expect(screen.queryByTestId('cancelReindexingDocumentsButton')).toBeNull();
  });

  it('has completed', () => {
    renderWithI18n(
      <ReindexProgress
        reindexState={{
          ...createReindexState({
            loadingState: LoadingState.Success,
            meta: {
              ...createReindexState().meta,
              indexName: 'foo',
              reindexName: 'reindexed-foo',
              aliases: [],
            },
          }),
          lastCompletedStep: ReindexStep.aliasCreated,
          status: ReindexStatus.completed,
          reindexTaskPercComplete: 1,
        }}
        cancelReindex={jest.fn()}
      />
    );

    expect(screen.getByTestId('reindexChecklistTitle')).toHaveTextContent('Reindexing process');
    expect(screen.queryByTestId('cancelReindexingDocumentsButton')).toBeNull();
  });
});
