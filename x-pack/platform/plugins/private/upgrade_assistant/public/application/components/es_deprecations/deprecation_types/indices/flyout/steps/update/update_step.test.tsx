/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { UpdateIndexFlyoutStep } from './update_step';
import type { ReindexState } from '../../../use_reindex';
import type { UpdateIndexState } from '../../../use_update_index';

describe('UpdateIndexFlyoutStep', () => {
  const meta: ReindexState['meta'] = {
    indexName: 'some_index',
    aliases: [],
    isInDataStream: false,
    isFrozen: false,
    isReadonly: false,
    isClosedIndex: false,
    reindexName: 'some_index-reindexed-for-9',
    isFollowerIndex: false,
  };

  const defaultUpdateIndexState: UpdateIndexState = {
    status: 'incomplete',
    failedBefore: false,
  };

  it('renders makeReadonly operation', () => {
    const wrapper = shallow(
      <UpdateIndexFlyoutStep
        action="makeReadonly"
        closeFlyout={jest.fn()}
        meta={meta}
        retry={jest.fn()}
        updateIndexState={defaultUpdateIndexState}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiFlyoutBody>
          <EuiTitle
            data-test-subj="updateIndexFlyoutTitle"
            size="xs"
          >
            <h3>
              <MemoizedFormattedMessage
                defaultMessage="Upgrade in progress…"
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.updateStep.checklist.title.updateInProgressText"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer />
          <StepProgress
            steps={
              Array [
                Object {
                  "status": "incomplete",
                  "title": <Memo(MemoizedFormattedMessage)
                    defaultMessage="Setting {indexName} index to read-only."
                    id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.updateStep.checklist.step.readonlyStepText"
                    values={
                      Object {
                        "indexName": <EuiCode>
                          some_index
                        </EuiCode>,
                      }
                    }
                  />,
                },
              ]
            }
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup
            justifyContent="spaceBetween"
          >
            <EuiFlexItem
              grow={false}
            >
              <EuiButtonEmpty
                flush="left"
                iconType="cross"
                onClick={[MockFunction]}
              >
                <MemoizedFormattedMessage
                  defaultMessage="Close"
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.closeButtonLabel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </Fragment>
    `);
  });

  it('renders unfreeze operation', () => {
    const wrapper = shallow(
      <UpdateIndexFlyoutStep
        action="unfreeze"
        closeFlyout={jest.fn()}
        meta={meta}
        retry={jest.fn()}
        updateIndexState={defaultUpdateIndexState}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiFlyoutBody>
          <EuiTitle
            data-test-subj="updateIndexFlyoutTitle"
            size="xs"
          >
            <h3>
              <MemoizedFormattedMessage
                defaultMessage="Upgrade in progress…"
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.updateStep.checklist.title.updateInProgressText"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer />
          <StepProgress
            steps={
              Array [
                Object {
                  "status": "incomplete",
                  "title": <Memo(MemoizedFormattedMessage)
                    defaultMessage="Unfreezing {indexName} index."
                    id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.updateStep.checklist.step.unfreezeStepText"
                    values={
                      Object {
                        "indexName": <EuiCode>
                          some_index
                        </EuiCode>,
                      }
                    }
                  />,
                },
              ]
            }
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup
            justifyContent="spaceBetween"
          >
            <EuiFlexItem
              grow={false}
            >
              <EuiButtonEmpty
                flush="left"
                iconType="cross"
                onClick={[MockFunction]}
              >
                <MemoizedFormattedMessage
                  defaultMessage="Close"
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.closeButtonLabel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </Fragment>
    `);
  });
});
