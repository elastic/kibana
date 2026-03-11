/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { PresentationContainer } from '@kbn/presentation-publishing';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { ML_APP_NAME, PLUGIN_ICON, PLUGIN_ID } from '../../common/constants/app';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../embeddables';
import type { AnomalySwimLaneEmbeddableApi } from '../embeddables/anomaly_swimlane/types';
import type { MlCoreSetup } from '../plugin';
import { AnomalySwimlaneUserInput } from '../embeddables/anomaly_swimlane/anomaly_swimlane_setup_flyout';

export const EDIT_SWIMLANE_PANEL_ACTION = 'editSwimlanePanelAction';

export type CreateSwimlanePanelActionContext = EmbeddableApiContext & {
  embeddable: AnomalySwimLaneEmbeddableApi;
};

const parentApiIsCompatible = async (
  parentApi: unknown
): Promise<PresentationContainer | undefined> => {
  const { apiIsPresentationContainer } = await import('@kbn/presentation-publishing');
  // we cannot have an async type check, so return the casted parentApi rather than a boolean
  return apiIsPresentationContainer(parentApi) ? (parentApi as PresentationContainer) : undefined;
};

export function createAddSwimlanePanelAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<CreateSwimlanePanelActionContext> {
  return {
    id: 'create-anomaly-swimlane',
    grouping: [
      {
        id: PLUGIN_ID,
        getDisplayName: () => ML_APP_NAME,
        getIconType: () => PLUGIN_ICON,
      },
    ],
    order: 40,
    getIconType: () => 'anomalySwimLane',
    getDisplayName: () =>
      i18n.translate('xpack.ml.components.jobAnomalyScoreEmbeddable.displayName', {
        defaultMessage: 'Anomaly swim lane',
      }),
    getDisplayNameTooltip: () =>
      i18n.translate('xpack.ml.components.jobAnomalyScoreEmbeddable.description', {
        defaultMessage: 'View anomaly detection results in a timeline.',
      }),
    async isCompatible(context: EmbeddableApiContext) {
      return Boolean(await parentApiIsCompatible(context.embeddable));
    },
    async execute(context) {
      const presentationContainerParent = await parentApiIsCompatible(context.embeddable);
      if (!presentationContainerParent) throw new IncompatibleActionError();

      const [coreStart, pluginStart] = await getStartServices();

      openLazyFlyout({
        core: coreStart,
        parentApi: context.embeddable,
        flyoutProps: {
          focusedPanelId: context.embeddable.uuid,
        },
        loadContent: async ({ closeFlyout }) => {
          return (
            <AnomalySwimlaneUserInput
              coreStart={coreStart}
              pluginStart={pluginStart}
              onConfirm={(initialState) => {
                presentationContainerParent.addNewPanel({
                  panelType: ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
                  serializedState: {
                    ...initialState,
                    title: initialState.panelTitle,
                  },
                });
                closeFlyout();
              }}
              onCancel={closeFlyout}
            />
          );
        },
      });
    },
  };
}
