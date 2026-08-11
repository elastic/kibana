/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import { closeIndices as request } from '../../services';
import { clearRowStatus, reloadIndices } from '.';
import type { AppDispatch } from '../types';
import { getHttpErrorToastMessage } from '../http_error';
import type { AppDependencies } from '../../app_context';

export const closeIndicesStart = createAction('INDEX_MANAGEMENT_CLOSE_INDICES_START');
export const closeIndices =
  ({ indexNames }: { indexNames: string[] }) =>
  async (
    dispatch: AppDispatch,
    _getState: () => unknown,
    { notificationService }: AppDependencies['services']
  ) => {
    dispatch(closeIndicesStart({ indexNames }));
    try {
      await request(indexNames);
    } catch (error) {
      notificationService.showDangerToast(getHttpErrorToastMessage(error));
      return dispatch(clearRowStatus({ indexNames }));
    }
    dispatch(reloadIndices(indexNames));
    notificationService.showSuccessToast(
      i18n.translate('xpack.idxMgmt.closeIndicesAction.successfullyClosedIndicesMessage', {
        defaultMessage: 'Successfully closed {count, plural, one {# index} other {# indices} }',
        values: { count: indexNames.length },
      })
    );
  };
