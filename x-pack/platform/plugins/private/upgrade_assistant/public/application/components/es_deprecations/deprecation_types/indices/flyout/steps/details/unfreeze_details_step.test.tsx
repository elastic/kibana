/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import type { ReindexState } from '../../../use_reindex';
import type { UpdateIndexState } from '../../../use_update_index';
import { LoadingState } from '../../../../../../types';
import { UnfreezeDetailsFlyoutStep } from './unfreeze_details_step';

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
            http: {
              basePath: {
                prepend: jest.fn(),
              },
            },
          },
        },
      };
    },
  };
});

describe('UnfreezeDetailsFlyoutStep', () => {
  const defaultReindexState: ReindexState = {
    loadingState: LoadingState.Success,
    meta: {
      indexName: 'some_index',
      aliases: [],
      isFrozen: true,
      isReadonly: true,
      isInDataStream: false,
      isClosedIndex: false,
      reindexName: 'some_index-reindexed-for-9',
    },
    hasRequiredPrivileges: true,
    reindexTaskPercComplete: null,
    errorMessage: null,
  };

  const defaultUpdateIndexState: UpdateIndexState = {
    status: 'incomplete',
    failedBefore: false,
  };

  it('renders all options for non data stream backing indices', () => {
    const wrapper = shallow(
      <UnfreezeDetailsFlyoutStep
        closeFlyout={jest.fn()}
        startReindex={jest.fn()}
        unfreeze={jest.fn()}
        reindexState={defaultReindexState}
        updateIndexState={defaultUpdateIndexState}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiFlyoutBody>
          <EuiText>
            <p>
              <MemoizedFormattedMessage
                defaultMessage="This index is frozen. Frozen indices will no longer be supported after the upgrade. Choose one of the following options:"
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.frozenIndexText"
              />
            </p>
            <EuiDescriptionList
              listItems={
                Array [
                  Object {
                    "description": <EuiText
                      size="m"
                    >
                      <Memo(MemoizedFormattedMessage)
                        defaultMessage="Unfreeze this index and make it read-only. This ensures that the index will remain compatible with the next major version."
                        id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreeze.option1.description"
                      />
                    </EuiText>,
                    "title": "Option 1: Unfreeze index",
                  },
                  Object {
                    "description": <EuiText
                      size="m"
                    >
                      <Memo(MemoizedFormattedMessage)
                        defaultMessage="Alternatively, you can reindex the data into a new, compatible index. All existing documents will be copied over to a new index, and the old index will be removed. Depending on the size of the index and the available resources, the reindexing operation can take some time. Your data will be in read-only mode until the reindexing has completed."
                        id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreeze.option2.description"
                      />
                    </EuiText>,
                    "title": "Option 2: Reindex data",
                  },
                  Object {
                    "description": <EuiText
                      size="m"
                    >
                      <Memo(MemoizedFormattedMessage)
                        defaultMessage="If you no longer need it, you can also delete the index from {indexManagementLinkHtml}."
                        id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreeze.alternativeOption.description"
                        values={
                          Object {
                            "indexManagementLinkHtml": <EuiLink
                              href="undefined"
                            >
                              <Memo(MemoizedFormattedMessage)
                                defaultMessage="Index Management"
                                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.indexMgmtLink"
                              />
                            </EuiLink>,
                          }
                        }
                      />
                    </EuiText>,
                    "title": "Alternatively: Manually delete index",
                  },
                ]
              }
              rowGutterSize="m"
            />
          </EuiText>
          <EuiSpacer />
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
            <EuiFlexItem
              grow={false}
            >
              <EuiFlexGroup
                gutterSize="s"
              >
                <EuiFlexItem
                  grow={false}
                >
                  <EuiButton
                    color="primary"
                    data-test-subj="startReindexingButton"
                    disabled={false}
                    isLoading={false}
                    onClick={[MockFunction]}
                  >
                    <MemoizedFormattedMessage
                      defaultMessage="Start reindexing"
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexButton.runReindexLabel"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem
                  grow={false}
                >
                  <EuiButton
                    data-test-subj="startIndexReadonlyButton"
                    disabled={false}
                    fill={true}
                    onClick={[MockFunction]}
                  >
                    <MemoizedFormattedMessage
                      data-test-subj="startIndexReadonlyButton"
                      defaultMessage="Unfreeze"
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreezeIndexButton"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </Fragment>
    `);
  });

  it('does NOT render Reindex option for data stream backing indices', () => {
    const backingIndexReindexState = {
      ...defaultReindexState,
      meta: {
        ...defaultReindexState.meta,
        isInDataStream: true,
      },
    };

    const wrapper = shallow(
      <UnfreezeDetailsFlyoutStep
        closeFlyout={jest.fn()}
        startReindex={jest.fn()}
        unfreeze={jest.fn()}
        reindexState={backingIndexReindexState}
        updateIndexState={defaultUpdateIndexState}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiFlyoutBody>
          <EuiText>
            <p>
              <MemoizedFormattedMessage
                defaultMessage="This index is frozen. Frozen indices will no longer be supported after the upgrade. Choose one of the following options:"
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.frozenIndexText"
              />
            </p>
            <EuiDescriptionList
              listItems={
                Array [
                  Object {
                    "description": <EuiText
                      size="m"
                    >
                      <Memo(MemoizedFormattedMessage)
                        defaultMessage="Unfreeze this index and make it read-only. This ensures that the index will remain compatible with the next major version."
                        id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreeze.option1.description"
                      />
                    </EuiText>,
                    "title": "Option 1: Unfreeze index",
                  },
                  Object {
                    "description": <EuiText
                      size="m"
                    >
                      <Memo(MemoizedFormattedMessage)
                        defaultMessage="If you no longer need it, you can also delete the index from {indexManagementLinkHtml}."
                        id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreeze.alternativeOption.description"
                        values={
                          Object {
                            "indexManagementLinkHtml": <EuiLink
                              href="undefined"
                            >
                              <Memo(MemoizedFormattedMessage)
                                defaultMessage="Index Management"
                                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.indexMgmtLink"
                              />
                            </EuiLink>,
                          }
                        }
                      />
                    </EuiText>,
                    "title": "Alternatively: Manually delete index",
                  },
                ]
              }
              rowGutterSize="m"
            />
          </EuiText>
          <EuiSpacer />
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
            <EuiFlexItem
              grow={false}
            >
              <EuiFlexGroup
                gutterSize="s"
              >
                <EuiFlexItem
                  grow={false}
                >
                  <EuiButton
                    data-test-subj="startIndexReadonlyButton"
                    disabled={false}
                    fill={true}
                    onClick={[MockFunction]}
                  >
                    <MemoizedFormattedMessage
                      data-test-subj="startIndexReadonlyButton"
                      defaultMessage="Unfreeze"
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.unfreezeIndexButton"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </Fragment>
    `);
  });
});
