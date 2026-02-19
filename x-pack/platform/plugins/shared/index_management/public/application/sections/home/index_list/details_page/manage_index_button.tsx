/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { HttpSetup } from '@kbn/core-http-browser';

import type { Index } from '../../../../../../common';
import {
  clearCacheIndices as clearCacheIndicesRequest,
  closeIndices as closeIndicesRequest,
  deleteIndices as deleteIndicesRequest,
  flushIndices as flushIndicesRequest,
  forcemergeIndices as forcemergeIndicesRequest,
  openIndices as openIndicesRequest,
  refreshIndices as refreshIndicesRequest,
} from '../../../../services';
import { notificationService } from '../../../../services/notification';
import { httpService } from '../../../../services/http';

import type { IndexActionsContextMenuProps } from '../index_actions_context_menu/index_actions_context_menu';
import { IndexActionsContextMenu } from '../index_actions_context_menu/index_actions_context_menu';

const getIndexStatusByName = (
  indexNames: string[],
  indices: Index[]
): IndexActionsContextMenuProps['indexStatusByName'] => {
  const indexStatusByName: IndexActionsContextMenuProps['indexStatusByName'] = {};
  indexNames.forEach((indexName) => {
    const { status } = indices.find((index) => index.name === indexName) ?? {};
    indexStatusByName[indexName] = status;
  });
  return indexStatusByName;
};

interface Props {
  index: Index;
  reloadIndexDetails: () => Promise<void>;
  navigateToIndicesList: () => void;
  fill?: boolean;
}

/**
 * This component is a wrapper for the underlying "index actions context menu" that is currently used
 * in the indices list and works with redux. That is why all request helpers from the services are expecting
 * an array of indices, for example "deleteIndices(indexNames)".
 *
 */
export const ManageIndexButton: FunctionComponent<Props> = ({
  index,
  reloadIndexDetails,
  navigateToIndicesList,
  fill = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // the "index actions context menu" component is expecting an array of indices, the same as on the indices list
  const indexNames = useMemo(() => [index.name], [index]);

  const reloadIndices = useCallback(async () => {
    setIsLoading(true);
    await reloadIndexDetails();
    setIsLoading(false);
  }, [reloadIndexDetails]);

  // the "index actions context menu" component is expecting an array of indices, the same as on the indices list
  const indices = [index];
  const indexStatusByName = getIndexStatusByName(indexNames, indices);

  const closeIndices = useCallback(async () => {
    setIsLoading(true);
    try {
      await closeIndicesRequest(indexNames);
      await reloadIndices();
      setIsLoading(false);
      notificationService.showSuccessToast(
        i18n.translate('xpack.idxMgmt.closeIndicesAction.indexClosedMessage', {
          defaultMessage: 'The index {indexNames} was closed.',
          values: { indexNames: indexNames.join(', ') },
        })
      );
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndices, indexNames]);

  const openIndices = useCallback(async () => {
    setIsLoading(true);
    try {
      await openIndicesRequest(indexNames);
      await reloadIndices();
      setIsLoading(false);
      notificationService.showSuccessToast(
        i18n.translate('xpack.idxMgmt.openIndicesAction.indexOpenedMessage', {
          defaultMessage: 'The index {indexNames} was opened.',
          values: { indexNames: indexNames.join(', ') },
        })
      );
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndices, indexNames]);

  const flushIndices = useCallback(async () => {
    setIsLoading(true);
    try {
      await flushIndicesRequest(indexNames);
      await reloadIndices();
      setIsLoading(false);
      notificationService.showSuccessToast(
        i18n.translate('xpack.idxMgmt.flushIndicesAction.indexFlushedMessage', {
          defaultMessage: 'The index {indexNames} was flushed.',
          values: { indexNames: indexNames.join(', ') },
        })
      );
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndices, indexNames]);

  const refreshIndices = useCallback(async () => {
    setIsLoading(true);
    try {
      await refreshIndicesRequest(indexNames);
      await reloadIndices();
      setIsLoading(false);
      notificationService.showSuccessToast(
        i18n.translate('xpack.idxMgmt.refreshIndicesAction.indexRefreshedMessage', {
          defaultMessage: 'The index {indexNames} was refreshed.',
          values: { indexNames: indexNames.join(', ') },
        })
      );
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndices, indexNames]);

  const clearCacheIndices = useCallback(async () => {
    setIsLoading(true);
    try {
      await clearCacheIndicesRequest(indexNames);
      await reloadIndices();
      setIsLoading(false);
      notificationService.showSuccessToast(
        i18n.translate('xpack.idxMgmt.clearCacheIndicesAction.indexCacheClearedMessage', {
          defaultMessage: 'The cache of the index {indexNames} was cleared.',
          values: { indexNames: indexNames.join(', ') },
        })
      );
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndices, indexNames]);

  const forcemergeIndices = useCallback(
    async (maxNumSegments: string) => {
      setIsLoading(true);
      try {
        await forcemergeIndicesRequest(indexNames, maxNumSegments);
        await reloadIndices();
        setIsLoading(false);
        notificationService.showSuccessToast(
          i18n.translate('xpack.idxMgmt.forceMergeIndicesAction.indexForcemergedMessage', {
            defaultMessage: 'The index {indexNames} was force merged.',
            values: { indexNames: indexNames.join(', ') },
          })
        );
      } catch (error) {
        setIsLoading(false);
        notificationService.showDangerToast(error.body.message);
      }
    },
    [reloadIndices, indexNames]
  );

  const deleteIndices = useCallback(async () => {
    setIsLoading(true);
    try {
      await deleteIndicesRequest(indexNames);
      setIsLoading(false);
      notificationService.showSuccessToast(
        i18n.translate('xpack.idxMgmt.deleteIndicesAction.indexDeletedMessage', {
          defaultMessage: 'The index {indexNames} was deleted.',
          values: { indexNames: indexNames.join(', ') },
        })
      );
      navigateToIndicesList();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [navigateToIndicesList, indexNames]);

  const performExtensionAction = useCallback(
    async (
      requestMethod: (indexNames: string[], http: HttpSetup) => Promise<void>,
      successMessage: string
    ) => {
      setIsLoading(true);
      try {
        await requestMethod(indexNames, httpService.httpClient);
        await reloadIndices();
        setIsLoading(false);
        notificationService.showSuccessToast(successMessage);
      } catch (error) {
        setIsLoading(false);
        notificationService.showDangerToast(error.body.message);
      }
    },
    [reloadIndices, indexNames]
  );

  return (
    <IndexActionsContextMenu
      indexNames={indexNames}
      indices={indices}
      indexStatusByName={indexStatusByName}
      fill={fill}
      isLoading={isLoading}
      // index actions
      closeIndices={closeIndices}
      openIndices={openIndices}
      flushIndices={flushIndices}
      refreshIndices={refreshIndices}
      clearCacheIndices={clearCacheIndices}
      forcemergeIndices={forcemergeIndices}
      deleteIndices={deleteIndices}
      performExtensionAction={performExtensionAction}
      reloadIndices={reloadIndices}
    />
  );
};
