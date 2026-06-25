/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import type { Index } from '../../../../common';
import { reloadIndices as request } from '../../services';
import { loadIndices } from './load_indices';
import type { AppDispatch } from '../types';
import { toHttpError } from '../http_error';
import type { AppDependencies } from '../../app_context';

export const reloadIndicesSuccess = createAction('INDEX_MANAGEMENT_RELOAD_INDICES_SUCCESS');
export const reloadIndices =
  (indexNames: string[], options?: { asSystemRequest?: boolean }) =>
  async (
    dispatch: AppDispatch,
    _getState: () => unknown,
    { notificationService }: AppDependencies['services']
  ) => {
    let indices: Index[] | undefined;
    try {
      indices = await request(indexNames, options);
    } catch (error) {
      // an index has been deleted
      // or the user does not have privileges for one of the indices on the current page,
      // reload the full list
      const httpError = toHttpError(error);
      if (httpError.status === 404 || httpError.status === 403) {
        return dispatch(loadIndices());
      }
      return notificationService.showDangerToast(
        httpError.body?.message ?? httpError.body?.error ?? ''
      );
    }
    if (indices && indices.length > 0) {
      return dispatch(reloadIndicesSuccess({ indices }));
    } else {
      return notificationService.showWarningToast(
        i18n.translate('xpack.idxMgmt.reloadIndicesAction.indicesPageRefreshFailureMessage', {
          defaultMessage: 'Failed to refresh current page of indices.',
        })
      );
    }
  };
