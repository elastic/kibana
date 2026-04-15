/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import { forcemergeIndices as request } from '../../services';
import { clearRowStatus, reloadIndices } from '.';
import { notificationService } from '../../services/notification';
import type { AppDispatch } from '../types';
import { getHttpErrorToastMessage } from '../http_error';

export const forcemergeIndicesStart = createAction('INDEX_MANAGEMENT_FORCEMERGE_INDICES_START');

export const forcemergeIndices =
  ({ indexNames, maxNumSegments }: { indexNames: string[]; maxNumSegments: string }) =>
  async (dispatch: AppDispatch) => {
    dispatch(forcemergeIndicesStart({ indexNames }));
    try {
      await request(indexNames, maxNumSegments);
    } catch (error) {
      notificationService.showDangerToast(getHttpErrorToastMessage(error));
      return dispatch(clearRowStatus({ indexNames }));
    }
    dispatch(reloadIndices(indexNames));
    notificationService.showSuccessToast(
      i18n.translate(
        'xpack.idxMgmt.forceMergeIndicesAction.successfullyForceMergedIndicesMessage',
        {
          defaultMessage:
            'Successfully force merged {count, plural, one {# index} other {# indices} }',
          values: { count: indexNames.length },
        }
      )
    );
  };
