/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ReindexDetailsFlyoutStep } from './reindex_details_step';
import type { ReindexState } from '../../../use_reindex';
import type { UpdateIndexState } from '../../../use_update_index';
import { LoadingState } from '../../../../../../types';
import { EnrichedDeprecationInfo } from '../../../../../../../../../common/types';

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

describe('ReindexDetailsFlyoutStep', () => {
  const defaultDeprecation: () => EnrichedDeprecationInfo = () => ({
    level: 'critical',
    message: 'foo',
    resolveDuringUpgrade: false,
    type: 'index_settings',
    url: 'https://te.st',
  });
  const defaultReindexState: () => ReindexState = () => ({
    loadingState: LoadingState.Success,
    meta: {
      indexName: 'some_index',
      reindexName: 'some_index-reindexed-for-9',
      aliases: [],
      isInDataStream: false,
      isFrozen: false,
      isReadonly: false,
      isClosedIndex: false,
      isFollowerIndex: false,
    },
    hasRequiredPrivileges: true,
    reindexTaskPercComplete: null,
    errorMessage: null,
  });

  const defaultUpdateIndexState: () => UpdateIndexState = () => ({
    status: 'incomplete',
    failedBefore: false,
  });

  it('renders for non-readonly indices', () => {
    const wrapper = shallow(
      <ReindexDetailsFlyoutStep
        closeFlyout={jest.fn()}
        startReindex={jest.fn()}
        startReadonly={jest.fn()}
        reindexState={defaultReindexState()}
        updateIndexState={defaultUpdateIndexState()}
        deprecation={defaultDeprecation()}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiFlyoutBody>
          <EuiText>
            <p>
              <MemoizedFormattedMessage
                defaultMessage="This index was created in ES 7.x and it is not compatible with the next major version. Choose one of the following options:"
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.notCompatibleIndexText"
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
                        defaultMessage="The reindex operation allows transforming an index into a new, compatible one. It will copy all of the existing documents into a new index and remove the old one. Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed."
                        id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option1.description"
                      />
                    </EuiText>,
                    "title": <EuiFlexGroup
                      alignItems="center"
                      gutterSize="s"
                      justifyContent="flexStart"
                    >
                      <EuiFlexItem
                        grow={false}
                      >
                        <Memo(MemoizedFormattedMessage)
                          defaultMessage="Option {optionCount}: Reindex data"
                          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option1.title"
                          values={
                            Object {
                              "optionCount": 1,
                            }
                          }
                        />
                      </EuiFlexItem>
                      <EuiFlexItem
                        grow={false}
                      >
                        <RecommendedOptionBadge />
                      </EuiFlexItem>
                    </EuiFlexGroup>,
                  },
                  Object {
                    "description": <EuiText
                      size="m"
                    >
                      <Memo(MemoizedFormattedMessage)
                        defaultMessage="Old indices can maintain compatibility with the next major version if they are turned into read-only mode. If you no longer need to update documents in this index (or add new ones), you might want to convert it to a read-only index. {docsLink}"
                        id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option2.description"
                        values={
                          Object {
                            "docsLink": <EuiLink
                              href="https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/index-modules-blocks.html#index-block-settings"
                              target="_blank"
                            >
                              Learn more
                            </EuiLink>,
                          }
                        }
                      />
                    </EuiText>,
                    "title": <EuiFlexGroup
                      alignItems="center"
                      gutterSize="s"
                      justifyContent="flexStart"
                    >
                      <EuiFlexItem
                        grow={false}
                      >
                        <Memo(MemoizedFormattedMessage)
                          defaultMessage="Option {optionCount}: Mark as read-only"
                          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option2.title"
                          values={
                            Object {
                              "optionCount": 2,
                            }
                          }
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>,
                  },
                  Object {
                    "description": <EuiText
                      size="m"
                    >
                      <Memo(MemoizedFormattedMessage)
                        defaultMessage="If you no longer need it, you can also delete the index from {indexManagementLinkHtml}."
                        id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option3.description"
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
                    "title": "Option 3: Delete index",
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
                data-test-subj="closeReindexButton"
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
                    data-test-subj="startIndexReadonlyButton"
                    disabled={false}
                    fill={false}
                    onClick={[MockFunction]}
                  >
                    <MemoizedFormattedMessage
                      defaultMessage="Mark as read-only"
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.startIndexReadonlyButton"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem
                  grow={false}
                >
                  <EuiButton
                    color="primary"
                    data-test-subj="startReindexingButton"
                    disabled={false}
                    fill={true}
                    isLoading={false}
                    onClick={[MockFunction]}
                  >
                    <MemoizedFormattedMessage
                      defaultMessage="Start reindexing"
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexButton.runReindexLabel"
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

  it('renders correct guidance for indices with transforms', () => {
    const wrapper = shallow(
      <ReindexDetailsFlyoutStep
        closeFlyout={jest.fn()}
        startReindex={jest.fn()}
        startReadonly={jest.fn()}
        reindexState={defaultReindexState()}
        updateIndexState={defaultUpdateIndexState()}
        deprecation={{
          ...defaultDeprecation(),
          correctiveAction: {
            type: 'reindex',
            transformIds: ['abc', 'def'],
            metadata: {
              isFrozenIndex: false,
              isInDataStream: false,
              isClosedIndex: false,
            },
          },
        }}
      />
    );
    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiFlyoutBody>
          <EuiText>
            <ESTransformsTargetGuidance
              deprecation={
                Object {
                  "correctiveAction": Object {
                    "metadata": Object {
                      "isClosedIndex": false,
                      "isFrozenIndex": false,
                      "isInDataStream": false,
                    },
                    "transformIds": Array [
                      "abc",
                      "def",
                    ],
                    "type": "reindex",
                  },
                  "level": "critical",
                  "message": "foo",
                  "resolveDuringUpgrade": false,
                  "type": "index_settings",
                  "url": "https://te.st",
                }
              }
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
                data-test-subj="closeReindexButton"
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
                    data-test-subj="startIndexReadonlyButton"
                    disabled={false}
                    fill={false}
                    onClick={[MockFunction]}
                  >
                    <MemoizedFormattedMessage
                      defaultMessage="Mark as read-only"
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.startIndexReadonlyButton"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem
                  grow={false}
                >
                  <EuiButton
                    color="primary"
                    data-test-subj="startReindexingButton"
                    disabled={false}
                    fill={true}
                    isLoading={false}
                    onClick={[MockFunction]}
                  >
                    <MemoizedFormattedMessage
                      defaultMessage="Start reindexing"
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexButton.runReindexLabel"
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

  it('renders for readonly indices (warning deprecation)', () => {
    const props = defaultReindexState();
    props.meta.isReadonly = true;

    const wrapper = shallow(
      <ReindexDetailsFlyoutStep
        closeFlyout={jest.fn()}
        startReindex={jest.fn()}
        startReadonly={jest.fn()}
        reindexState={props}
        updateIndexState={defaultUpdateIndexState()}
        deprecation={defaultDeprecation()}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiFlyoutBody>
          <EuiText>
            <p>
              <MemoizedFormattedMessage
                defaultMessage="This index was created in ES 7.x. It has been marked as read-only, which enables compatibility with the next major version."
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.readonlyCompatibleIndexText"
              />
            </p>
            <p>
              <MemoizedFormattedMessage
                defaultMessage="The reindex operation allows transforming an index into a new, compatible one. It will copy all of the existing documents into a new index and remove the old one. Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed."
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexText"
              />
            </p>
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
                data-test-subj="closeReindexButton"
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
                    fill={true}
                    isLoading={false}
                    onClick={[MockFunction]}
                  >
                    <MemoizedFormattedMessage
                      defaultMessage="Start reindexing"
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexButton.runReindexLabel"
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

  it('renders ML anomaly index guidance', () => {
    const reindexState = defaultReindexState();
    reindexState.meta.indexName = '.ml-anomalies-1';
    const deprecation = defaultDeprecation();
    deprecation.index = '.ml-anomalies-1';
    const wrapper = shallow(
      <ReindexDetailsFlyoutStep
        closeFlyout={jest.fn()}
        startReindex={jest.fn()}
        startReadonly={jest.fn()}
        reindexState={reindexState}
        updateIndexState={defaultUpdateIndexState()}
        deprecation={deprecation}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiFlyoutBody>
          <EuiText>
            <MlAnomalyGuidance />
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
                data-test-subj="closeReindexButton"
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
                    data-test-subj="startIndexReadonlyButton"
                    disabled={false}
                    fill={false}
                    onClick={[MockFunction]}
                  >
                    <MemoizedFormattedMessage
                      defaultMessage="Mark as read-only"
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.startIndexReadonlyButton"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem
                  grow={false}
                >
                  <EuiButton
                    color="primary"
                    data-test-subj="startReindexingButton"
                    disabled={false}
                    fill={true}
                    isLoading={false}
                    onClick={[MockFunction]}
                  >
                    <MemoizedFormattedMessage
                      defaultMessage="Start reindexing"
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexButton.runReindexLabel"
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
