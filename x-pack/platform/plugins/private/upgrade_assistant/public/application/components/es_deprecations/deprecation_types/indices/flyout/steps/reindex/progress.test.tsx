/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { ReindexStep } from '@kbn/reindex-service-plugin/common';
import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';
import { LoadingState } from '../../../../../../types';
import { ReindexProgress } from './progress';
import { createReindexState } from '../../../../test_utils/helpers';

describe('ReindexProgress', () => {
  it('renders', () => {
    const wrapper = shallow(
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

    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiTitle
          data-test-subj="reindexChecklistTitle"
          size="xs"
        >
          <h3>
            <MemoizedFormattedMessage
              defaultMessage="Reindexing in progress… {percents}"
              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.reindexingInProgressTitle"
              values={
                Object {
                  "percents": "0%",
                }
              }
            />
          </h3>
        </EuiTitle>
        <StepProgress
          steps={
            Array [
              Object {
                "status": "inProgress",
                "title": <Memo(MemoizedFormattedMessage)
                  defaultMessage="Setting {indexName} index to read-only."
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.reindexingChecklist.inProgress.readonlyStepTitle"
                  values={
                    Object {
                      "indexName": <EuiCode>
                        foo
                      </EuiCode>,
                    }
                  }
                />,
              },
              Object {
                "status": "incomplete",
                "title": <Memo(MemoizedFormattedMessage)
                  defaultMessage="Create {reindexName} index."
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.reindexingChecklist.createIndexStepTitle"
                  values={
                    Object {
                      "reindexName": <EuiCode>
                        reindexed-foo
                      </EuiCode>,
                    }
                  }
                />,
              },
              Object {
                "status": "incomplete",
                "title": <ReindexingDocumentsStepTitle
                  cancelReindex={[MockFunction]}
                  reindexState={
                    Object {
                      "cancelLoadingState": undefined,
                      "errorMessage": null,
                      "hasRequiredPrivileges": true,
                      "lastCompletedStep": 0,
                      "loadingState": 1,
                      "meta": Object {
                        "aliases": Array [],
                        "indexName": "foo",
                        "isClosedIndex": false,
                        "isFollowerIndex": false,
                        "isFrozen": false,
                        "isInDataStream": false,
                        "isReadonly": false,
                        "reindexName": "reindexed-foo",
                      },
                      "reindexTaskPercComplete": null,
                      "reindexWarnings": undefined,
                      "status": 0,
                    }
                  }
                />,
              },
              Object {
                "status": "incomplete",
                "title": <Memo(MemoizedFormattedMessage)
                  defaultMessage="Copy original index settings from {indexName} to {reindexName}."
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.reindexingChecklist.indexSettingsRestoredStepTitle"
                  values={
                    Object {
                      "indexName": <EuiCode>
                        foo
                      </EuiCode>,
                      "reindexName": <EuiCode>
                        reindexed-foo
                      </EuiCode>,
                    }
                  }
                />,
              },
              Object {
                "status": "incomplete",
                "title": <Memo(MemoizedFormattedMessage)
                  defaultMessage="Create {indexName} alias for {reindexName} index."
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.reindexingChecklist.aliasCreatedStepTitle"
                  values={
                    Object {
                      "indexName": <EuiCode>
                        foo
                      </EuiCode>,
                      "reindexName": <EuiCode>
                        reindexed-foo
                      </EuiCode>,
                    }
                  }
                />,
              },
              Object {
                "status": "incomplete",
                "title": <Memo(MemoizedFormattedMessage)
                  defaultMessage="Delete original {indexName} index."
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.reindexingChecklist.originalIndexDeletedStepTitle"
                  values={
                    Object {
                      "indexName": <EuiCode>
                        foo
                      </EuiCode>,
                    }
                  }
                />,
              },
            ]
          }
        />
      </Fragment>
    `);
  });

  it('displays errors in the step that failed', () => {
    const wrapper = shallow(
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
    const aliasStep = (wrapper.find('StepProgress').props() as any).steps[3];
    expect(aliasStep.children.props.errorMessage).toEqual(
      `This is an error that happened on alias switch`
    );
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
