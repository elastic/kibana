/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { StartServicesAccessor } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { PluginsStart } from '../../plugin';
import type { SpacesManager } from '../../spaces_manager';
import { SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX } from '../constants';
import type {
  SolutionViewSwitchCalloutInternalProps,
  SolutionViewSwitchCalloutProps,
} from '../types';

export interface GetSolutionViewSwitchCalloutOptions {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
}

export const getSolutionViewSwitchCalloutComponent = async ({
  spacesManager,
  getStartServices,
}: GetSolutionViewSwitchCalloutOptions): Promise<React.FC<SolutionViewSwitchCalloutProps>> => {
  const [{ application, notifications }] = await getStartServices();
  const manageSpacesUrl = application.getUrlForApp('management', { path: 'kibana/spaces' });

  const showError: SolutionViewSwitchCalloutInternalProps['showError'] = (error) => {
    const errorObj = error as { body?: { message?: string }; message?: string };
    const errorMessage = errorObj.body?.message ?? errorObj.message ?? String(error);

    notifications.toasts.addError(error instanceof Error ? error : new Error(errorMessage), {
      title: i18n.translate('xpack.spaces.solutionViewSwitch.errorSwitchingTitle', {
        defaultMessage: 'Error switching solution view: {message}',
        values: { message: errorMessage },
      }),
    });
  };

  const updateSpace: SolutionViewSwitchCalloutInternalProps['updateSpace'] = async (solution) => {
    const activeSpace = await spacesManager.getActiveSpace();
    const spaceId = activeSpace.id;
    await spacesManager.updateSpace({
      ...activeSpace,
      solution,
    });
    try {
      localStorage.setItem(`${SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX}:${spaceId}`, 'true');
    } catch {
      // Ignore storage errors
    }
    window.location.reload();
  };

  const { SolutionViewSwitchCalloutInternal } = await import(
    './solution_view_switch_callout_internal'
  );

  return (props: SolutionViewSwitchCalloutProps) => {
    return (
      <SolutionViewSwitchCalloutInternal
        {...props}
        manageSpacesUrl={manageSpacesUrl}
        updateSpace={updateSpace}
        showError={showError}
      />
    );
  };
};
