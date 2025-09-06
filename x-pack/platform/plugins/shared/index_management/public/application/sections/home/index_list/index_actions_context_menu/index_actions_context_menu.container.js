/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { IndexActionsContextMenu as PresentationComponent } from './index_actions_context_menu';
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
import { convertToLookupIndex as convertToLookupIndexRequest } from '../../../../services';
import { notificationService } from '../../../../services/notification';

const mapStateToProps = (state, ownProps) => {
  const indexStatusByName = {};
  const { indexNames } = ownProps;

  indexNames.forEach((indexName) => {
    indexStatusByName[indexName] = getIndexStatusByIndexName(state, indexName);
  });

  return {
    indexStatusByName,
    indices: getIndicesByName(state, indexNames),
  };
};

const mapDispatchToProps = (dispatch, { indexNames }) => {
  return {
    clearCacheIndices: () => {
      dispatch(clearCacheIndices({ indexNames }));
    },
    closeIndices: () => {
      dispatch(closeIndices({ indexNames }));
    },
    flushIndices: () => {
      dispatch(flushIndices({ indexNames }));
    },
    openIndices: () => {
      dispatch(openIndices({ indexNames }));
    },
    refreshIndices: () => {
      dispatch(refreshIndices({ indexNames }));
    },
    forcemergeIndices: (maxNumSegments) => {
      dispatch(forcemergeIndices({ indexNames, maxNumSegments }));
    },
    deleteIndices: () => {
      dispatch(deleteIndices({ indexNames }));
    },
    reloadIndices: () => {
      dispatch(reloadIndices(indexNames));
    },
    performExtensionAction: (requestMethod, successMessage) => {
      dispatch(performExtensionAction({ requestMethod, successMessage, indexNames }));
    },
    convertToLookupIndex: async (lookupIndexName) => {
      try {
        await convertToLookupIndexRequest(indexNames[0], lookupIndexName);
        notificationService.showSuccessToast(
          i18n.translate('xpack.idxMgmt.convertToLookupIndexAction.indexConvertedToastTitle', {
            defaultMessage: 'Lookup index created',
          }),
          i18n.translate('xpack.idxMgmt.convertToLookupIndexAction.indexConvertedToastMessage', {
            defaultMessage: 'The {lookupIndexName} has been created.',
            values: { lookupIndexName },
          })
        );
      } catch (error) {
        notificationService.showDangerToast(error.message);
      }
    },
  };
};

export const IndexActionsContextMenu = connect(
  mapStateToProps,
  mapDispatchToProps
)(PresentationComponent);
