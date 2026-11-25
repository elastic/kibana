/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core/public';
import { createAction, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { LensSerializedState } from '@kbn/lens-common';
import { isLensApi } from '../../react_embeddable/type_guards';
import { ACTION_OPEN_IN_LENS } from './constants';
import { isBuiltInActionRequested, notifyBuiltInActionExecuted } from './helpers';

export interface OpenInLensActionServices {
  application: Pick<ApplicationStart, 'capabilities'>;
  navigateToPrefilledEditor: (input: LensSerializedState) => void;
}

export const createOpenInLensAction = ({
  application,
  navigateToPrefilledEditor,
}: OpenInLensActionServices) =>
  createAction<EmbeddableApiContext>({
    id: ACTION_OPEN_IN_LENS,
    type: ACTION_OPEN_IN_LENS,
    order: 17,
    getIconType: () => 'lensApp',
    getDisplayName: () =>
      i18n.translate('xpack.lens.action.openInLens', { defaultMessage: 'Open in Lens' }),
    isCompatible: async ({ embeddable }) =>
      isLensApi(embeddable) &&
      isBuiltInActionRequested(embeddable, 'openInLens') &&
      Boolean(application.capabilities.visualize_v2?.show),
    execute: async ({ embeddable }) => {
      if (!isLensApi(embeddable)) throw new IncompatibleActionError();

      notifyBuiltInActionExecuted(embeddable, 'openInLens');
      navigateToPrefilledEditor({
        ...embeddable.getLegacySerializedState(),
        time_range: embeddable.timeRange$.getValue(),
      });
    },
  });
