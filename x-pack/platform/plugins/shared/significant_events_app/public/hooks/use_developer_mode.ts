/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE } from '@kbn/management-settings-ids';
import { useKibana } from './use_kibana';
import { getFormattedError } from '../util/errors';

export interface UseDeveloperModeResult {
  isDeveloperMode: boolean;
  setDeveloperMode: (enabled: boolean) => Promise<void>;
  canEditDeveloperMode: boolean;
}

export function useDeveloperMode(): UseDeveloperModeResult {
  const { core } = useKibana();
  const settingsClient = core.settings.client;
  const developerMode$ = useMemo(
    () => settingsClient.get$<boolean>(OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE, false),
    [settingsClient]
  );
  const isDeveloperMode = useObservable(
    developerMode$,
    settingsClient.get<boolean>(OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE, false)
  );
  const canEditDeveloperMode = core.application.capabilities.advancedSettings?.save === true;

  const setDeveloperMode = useCallback(
    async (enabled: boolean): Promise<void> => {
      let updateError: Error | undefined;
      const updateErrorSubscription = settingsClient.getUpdateErrors$().subscribe((error) => {
        updateError = error;
      });

      try {
        const wasSaved = await settingsClient.set(OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE, enabled);
        if (!wasSaved) {
          throw (
            updateError ??
            new Error(
              i18n.translate(
                'xpack.significantEventsApp.settings.developerModeSaveFailedErrorMessage',
                { defaultMessage: 'The developer mode setting could not be saved.' }
              )
            )
          );
        }
      } catch (error) {
        core.notifications.toasts.addDanger({
          title: i18n.translate(
            'xpack.significantEventsApp.settings.developerModeSaveFailedTitle',
            {
              defaultMessage: 'Unable to update developer mode',
            }
          ),
          text: getFormattedError(error).message,
        });
      } finally {
        updateErrorSubscription.unsubscribe();
      }
    },
    [core.notifications.toasts, settingsClient]
  );

  return {
    isDeveloperMode: isDeveloperMode ?? false,
    setDeveloperMode,
    canEditDeveloperMode,
  };
}
