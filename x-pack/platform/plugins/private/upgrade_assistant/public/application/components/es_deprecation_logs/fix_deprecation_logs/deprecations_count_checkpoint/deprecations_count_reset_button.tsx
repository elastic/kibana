/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import moment from 'moment-timezone';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';

import { useAppContext } from '../../../../app_context';
import { uiMetricService, UIM_RESET_LOGS_COUNTER_CLICK } from '../../../../lib/ui_metric';

const i18nTexts = {
  resetCounterButton: i18n.translate(
    'xpack.upgradeAssistant.overview.verifyChanges.resetCounterButton',
    {
      defaultMessage: 'Reset counter',
    }
  ),
  errorToastTitle: i18n.translate('xpack.upgradeAssistant.overview.verifyChanges.errorToastTitle', {
    defaultMessage: 'Could not delete deprecation logs cache',
  }),
};

interface Props {
  setCheckpoint: (value: string) => void;
}

export const ResetCounterButton: FunctionComponent<Props> = ({ setCheckpoint }) => {
  const [isDeletingCache, setIsDeletingCache] = useState(false);
  const {
    services: {
      api,
      core: { notifications },
    },
  } = useAppContext();

  const onResetClick = async () => {
    setIsDeletingCache(true);
    const { error: deleteLogsCacheError } = await api.deleteDeprecationLogsCache();
    setIsDeletingCache(false);

    if (deleteLogsCacheError) {
      notifications.toasts.addDanger({
        title: i18nTexts.errorToastTitle,
        text: deleteLogsCacheError.message.toString(),
      });
      return;
    }

    const now = moment().toISOString();
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_RESET_LOGS_COUNTER_CLICK);
    setCheckpoint(now);
  };

  return (
    <EuiButton
      color="primary"
      fill
      onClick={onResetClick}
      isLoading={isDeletingCache}
      data-test-subj="resetLastStoredDate"
    >
      {i18nTexts.resetCounterButton}
    </EuiButton>
  );
};
