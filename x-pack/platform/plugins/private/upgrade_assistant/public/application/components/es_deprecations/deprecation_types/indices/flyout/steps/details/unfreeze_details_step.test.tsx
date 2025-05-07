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
      isFollowerIndex: false,
    },
    hasRequiredPrivileges: true,
    reindexTaskPercComplete: null,
    errorMessage: null,
  };

  const defaultUpdateIndexState: UpdateIndexState = {
    status: 'incomplete',
    failedBefore: false,
  };

  it('renders all options for regular indices', () => {
    const wrapper = shallow(
      <UnfreezeDetailsFlyoutStep
        closeFlyout={jest.fn()}
        startReindex={jest.fn()}
        unfreeze={jest.fn()}
        reindexState={defaultReindexState}
        updateIndexState={defaultUpdateIndexState}
      />
    );

    expect(wrapper.find('EuiButton[data-test-subj="startReindexingButton"]')).toHaveLength(1);
    expect(wrapper.find('EuiButton[data-test-subj="startUnfreezeButton"]')).toHaveLength(1);
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

    expect(wrapper.find('EuiButton[data-test-subj="startReindexingButton"]')).toHaveLength(0);
    expect(wrapper.find('EuiButton[data-test-subj="startUnfreezeButton"]')).toHaveLength(1);
  });
});
