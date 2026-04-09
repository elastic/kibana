/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import type { StartServicesAccessor } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import { addSpaceIdToPath, ENTER_SPACE_PATH } from '../../../common';
import type { PluginsStart } from '../../plugin';
import type { SpacesManager } from '../../spaces_manager';
import { SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX } from '../constants';
import type {
  SolutionViewSwitchCalloutInternalProps,
  SolutionViewSwitchCalloutProps,
} from '../types';

const SOLUTION_VIEW_SWITCH_STORAGE_KEY_DISMISSED = `${SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX}.dismissed`;

const getIsDismissed = () => {
  try {
    return localStorage.getItem(SOLUTION_VIEW_SWITCH_STORAGE_KEY_DISMISSED) === 'true';
  } catch {
    return false;
  }
};

const setIsDismissed = () => {
  try {
    localStorage.setItem(SOLUTION_VIEW_SWITCH_STORAGE_KEY_DISMISSED, 'true');
  } catch {
    // Ignore storage errors
  }
};

export interface GetSolutionViewSwitchCalloutOptions {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
}

export const getSolutionViewSwitchCalloutComponent = async ({
  spacesManager,
  getStartServices,
}: GetSolutionViewSwitchCalloutOptions): Promise<React.FC<SolutionViewSwitchCalloutProps>> => {
  const [{ application, http, notifications }] = await getStartServices();
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

    window.location.href = addSpaceIdToPath(
      http.basePath.serverBasePath,
      spaceId,
      ENTER_SPACE_PATH
    );
  };

  const { SolutionViewSwitchCalloutInternal } = await import(
    './solution_view_switch_callout_internal'
  );

  return (props: SolutionViewSwitchCalloutProps) => {
    const [shouldShow, setShouldShow] = useState<boolean>(() => !getIsDismissed());

    const onDismiss: SolutionViewSwitchCalloutInternalProps['onDismiss'] = () => {
      setIsDismissed();
      setShouldShow(false);
    };

    if (!shouldShow) return null;

    return (
      <SolutionViewSwitchCalloutInternal
        {...props}
        manageSpacesUrl={manageSpacesUrl}
        updateSpace={updateSpace}
        showError={showError}
        onDismiss={onDismiss}
      />
    );
  };
};
