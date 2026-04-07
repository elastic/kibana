/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import type { ConnectedProps } from 'react-redux';
import type { HttpSetup } from '@kbn/core-http-browser';
import { IndexActionsContextMenu as PresentationComponent } from './index_actions_context_menu';
import type { IndexActionsContextMenuProps as PresentationComponentProps } from './index_actions_context_menu';
import {
  clearCacheIndices,
  closeIndices,
  deleteIndices,
  flushIndices,
  forcemergeIndices,
  openIndices,
  refreshIndices,
  performExtensionAction,
  reloadIndices,
} from '../../../../store/actions';

import { getIndexStatusByIndexName, getIndicesByName } from '../../../../store/selectors';
import type { IndexManagementState, AppDispatch } from '../../../../store/types';

interface OwnProps {
  indexNames: string[];
}

const mapStateToProps = (state: IndexManagementState, ownProps: OwnProps) => {
  const indexStatusByName: PresentationComponentProps['indexStatusByName'] = {};
  const { indexNames } = ownProps;

  indexNames.forEach((indexName) => {
    indexStatusByName[indexName] = getIndexStatusByIndexName(state, indexName);
  });

  return {
    indexStatusByName,
    indices: getIndicesByName(state, indexNames),
  };
};

const mapDispatchToProps = (dispatch: AppDispatch, { indexNames }: OwnProps) => {
  return {
    clearCacheIndices: async () => {
      await dispatch(clearCacheIndices({ indexNames }));
    },
    closeIndices: async () => {
      await dispatch(closeIndices({ indexNames }));
    },
    flushIndices: async () => {
      await dispatch(flushIndices({ indexNames }));
    },
    openIndices: async () => {
      await dispatch(openIndices({ indexNames }));
    },
    refreshIndices: async () => {
      await dispatch(refreshIndices({ indexNames }));
    },
    forcemergeIndices: async (maxNumSegments: string) => {
      await dispatch(forcemergeIndices({ indexNames, maxNumSegments }));
    },
    deleteIndices: async () => {
      await dispatch(deleteIndices({ indexNames }));
    },
    reloadIndices: () => {
      dispatch(reloadIndices(indexNames));
    },
    performExtensionAction: async (
      requestMethod: (indexNames: string[], http: HttpSetup) => Promise<void>,
      successMessage: string
    ) => {
      await dispatch(
        performExtensionAction({
          requestMethod,
          successMessage,
          indexNames,
        })
      );
    },
  };
};

const connector = connect(mapStateToProps, mapDispatchToProps);
export type PropsFromRedux = ConnectedProps<typeof connector>;

export const IndexActionsContextMenu = connector(PresentationComponent);
