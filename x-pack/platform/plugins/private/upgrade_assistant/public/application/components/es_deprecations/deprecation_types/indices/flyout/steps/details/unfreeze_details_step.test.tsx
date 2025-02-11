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
      reindexName: 'some_index-reindexed-for-9',
    },
    reindexTaskPercComplete: null,
    errorMessage: null,
  };

  const defaultUpdateIndexState: UpdateIndexState = {
    status: 'incomplete',
    failedBefore: false,
  };

  it('renders', () => {
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
          <FrozenCallOut />
          <EuiText>
            <p>
              <MemoizedFormattedMessage
                defaultMessage="This index was created in ES 7.x. It has been marked as read-only, which enables compatibility with the next major version."
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.readonlyCompatibleIndexText"
              />
            </p>
            <ul>
              <MemoizedFormattedMessage
                defaultMessage="In order to address this issue, you must unfreeze this index and keep it as read-only. This will enable compatibility with the next major version."
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.mustUnfreezeText"
                tagName="li"
              />
              <MemoizedFormattedMessage
                defaultMessage="Alternatively, you might opt for reindexing this index. The reindex operation allows transforming an index into a new, compatible one. It will copy all of the existing documents into a new index and remove the old one. Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed."
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.canReindexText"
                tagName="li"
              />
            </ul>
            <p>
              <MemoizedFormattedMessage
                defaultMessage="If you no longer need this data, you can also proceed by deleting this index. {indexManagementLinkHtml}"
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.deleteText"
                values={
                  Object {
                    "indexManagementLinkHtml": <EuiLink
                      href="undefined"
                    >
                      <Memo(MemoizedFormattedMessage)
                        defaultMessage="Go to index management"
                        id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.indexMgmtLink"
                      />
                    </EuiLink>,
                  }
                }
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
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </Fragment>
    `);
  });
});
