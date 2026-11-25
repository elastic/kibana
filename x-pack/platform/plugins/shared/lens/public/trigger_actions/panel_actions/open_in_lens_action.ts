/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core/public';
import { createAction, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { LensSerializedState } from '@kbn/lens-common';
import { isLensApi } from '../../react_embeddable/type_guards';
import { ACTION_OPEN_IN_LENS } from './constants';
import { getContextEmbeddable, getEffectiveTimeRange } from './helpers';

export interface OpenInLensActionServices {
  application: Pick<ApplicationStart, 'capabilities'>;
  navigateToPrefilledEditor: (
    input: LensSerializedState,
    options?: { openInNewTab?: boolean }
  ) => void;
}

export interface OpenInLensActionOptions {
  /** Called when the user runs the action */
  onExecute?: () => void;
  /** Opens the Lens editor in a new tab */
  openInNewTab?: boolean;
}

export const createOpenInLensAction = (
  { application, navigateToPrefilledEditor }: OpenInLensActionServices,
  { onExecute, openInNewTab }: OpenInLensActionOptions = {}
) =>
  createAction({
    id: ACTION_OPEN_IN_LENS,
    type: ACTION_OPEN_IN_LENS,
    order: 17,
    getIconType: () => 'lensApp',
    getDisplayName: () =>
      i18n.translate('xpack.lens.action.openInLens', { defaultMessage: 'Open in Lens' }),
    isCompatible: async (context) =>
      isLensApi(getContextEmbeddable(context)) &&
      Boolean(application.capabilities.visualize_v2?.show),
    execute: async (context) => {
      const embeddable = getContextEmbeddable(context);
      if (!isLensApi(embeddable)) throw new IncompatibleActionError();

      onExecute?.();
      navigateToPrefilledEditor(
        {
          ...embeddable.getLegacySerializedState(),
          time_range: getEffectiveTimeRange(embeddable),
        },
        { openInNewTab }
      );
    },
  });
