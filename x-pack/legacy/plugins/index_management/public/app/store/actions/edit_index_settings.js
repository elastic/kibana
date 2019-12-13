/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n }  from '@kbn/i18n';
import { loadIndexSettings as request } from '../../services';
import { notificationService } from '../../services/notification';
import { loadIndexDataSuccess } from './load_index_data';

export const editIndexSettings = ({ indexName }) => async (dispatch) => {
  let indexSettings;
  try {
    indexSettings = await request(indexName);
  } catch (error) {
    return notificationService.showDangerToast(error.message);
  }
  notificationService.showSuccessToast(
    i18n.translate('xpack.idxMgmt.editIndexSettingsAction.successfullySavedSettingsForIndicesMessage', {
      defaultMessage: 'Successfully saved settings for {indexName}',
      values: { indexName }
    })
  );
  dispatch(
    loadIndexDataSuccess({
      data: indexSettings,
      panelType: 'editIndexSettings',
      indexName
    })
  );
};
