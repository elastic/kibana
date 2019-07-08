/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';

import {
  UIM_POLICY_CREATE,
  UIM_POLICY_UPDATE,
} from '../../../common/constants';

import { showApiError } from '../../services/api_errors';
import { savePolicy as savePolicyApi } from '../../services/api';
import { trackUiMetric, getUiMetricsForPhases } from '../../services';

export const saveLifecyclePolicy = (lifecycle, isNew) => async () => {
  try {
    await savePolicyApi(lifecycle);
  }
  catch (err) {
    const title = i18n.translate('xpack.indexLifecycleMgmt.editPolicy.saveErrorMessage',
      {
        defaultMessage: 'Error saving lifecycle policy {lifecycleName}',
        values: { lifecycleName: lifecycle.name }
      }
    );
    showApiError(err, title);
    return false;
  }

  const uiMetrics = getUiMetricsForPhases(lifecycle.phases);
  uiMetrics.push(isNew ? UIM_POLICY_CREATE : UIM_POLICY_UPDATE);
  trackUiMetric(uiMetrics);

  const message = i18n.translate('xpack.indexLifecycleMgmt.editPolicy.successfulSaveMessage',
    {
      defaultMessage: '{verb} lifecycle policy "{lifecycleName}"',
      values: { verb: isNew ? i18n.translate('xpack.indexLifecycleMgmt.editPolicy.createdMessage', {
        defaultMessage: 'Created',
      }) : i18n.translate('xpack.indexLifecycleMgmt.editPolicy.updatedMessage', {
        defaultMessage: 'Updated',
      }), lifecycleName: lifecycle.name }
    },
  );
  toastNotifications.addSuccess(message);
  return true;
};
