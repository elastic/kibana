/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

import { i18n } from '@kbn/i18n';

import { ResponseError } from '../../../../../common/types';
import { useAppContext } from '../../../app_context';
import { DeprecationLoggingPreviewProps } from '../../types';

const i18nTexts = {
  enabledMessage: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.enabledToastMessage',
    {
      defaultMessage: 'Deprecated API requests will be logged and indexed.',
    }
  ),
  disabledMessage: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.disabledToastMessage',
    {
      defaultMessage: 'Deprecated API requests will not be logged.',
    }
  ),
};

export const useDeprecationLogging = (): DeprecationLoggingPreviewProps => {
  const {
    services: {
      api,
      core: { notifications },
    },
  } = useAppContext();
  const { data, error: fetchError, isLoading, resendRequest } = api.useLoadDeprecationLogging();

  const [isDeprecationLogIndexingEnabled, setIsDeprecationLogIndexingEnabled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [onlyDeprecationLogWritingEnabled, setOnlyDeprecationLogWritingEnabled] = useState(false);
  const [updateError, setUpdateError] = useState<ResponseError | undefined>();

  useEffect(() => {
    if (!isLoading && data) {
      const { isDeprecationLogIndexingEnabled: isIndexingEnabled, isDeprecationLoggingEnabled } =
        data;
      setIsDeprecationLogIndexingEnabled(isIndexingEnabled);

      if (!isIndexingEnabled && isDeprecationLoggingEnabled) {
        setOnlyDeprecationLogWritingEnabled(true);
      }
    }
  }, [data, isLoading]);

  const toggleLogging = async () => {
    setIsUpdating(true);

    const { data: updatedLoggingState, error: updateDeprecationError } =
      await api.updateDeprecationLogging({
        isEnabled: !isDeprecationLogIndexingEnabled,
      });

    setIsUpdating(false);
    setOnlyDeprecationLogWritingEnabled(false);

    if (updateDeprecationError) {
      setUpdateError(updateDeprecationError);
    } else if (updatedLoggingState) {
      setIsDeprecationLogIndexingEnabled(updatedLoggingState.isDeprecationLogIndexingEnabled);
      notifications.toasts.addSuccess(
        updatedLoggingState.isDeprecationLogIndexingEnabled
          ? i18nTexts.enabledMessage
          : i18nTexts.disabledMessage
      );
    }
  };

  return {
    isDeprecationLogIndexingEnabled,
    isLoading,
    isUpdating,
    toggleLogging,
    fetchError,
    updateError,
    resendRequest,
    onlyDeprecationLogWritingEnabled,
  };
};
