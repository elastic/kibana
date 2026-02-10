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
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis/constants';
import { AIOPS_EMBEDDABLE_GROUPING } from '@kbn/aiops-common/constants';

import { v4 } from 'uuid';
import type { LogRateAnalysisEmbeddableApi } from '../embeddables/log_rate_analysis/types';
import type { AiopsPluginStartDeps } from '../types';

import type { LogRateAnalysisActionContext } from './log_rate_analysis_action_context';
import { EmbeddableLogRateAnalysisUserInput } from '../embeddables/log_rate_analysis/log_rate_analysis_config_input';

const parentApiIsCompatible = async (
  parentApi: unknown
): Promise<PresentationContainer | undefined> => {
  const { apiIsPresentationContainer } = await import('@kbn/presentation-publishing');
  // we cannot have an async type check, so return the casted parentApi rather than a boolean
  return apiIsPresentationContainer(parentApi) ? (parentApi as PresentationContainer) : undefined;
};

export function createAddLogRateAnalysisEmbeddableAction(
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps
): UiActionsActionDefinition<LogRateAnalysisActionContext> {
  return {
    id: 'create-log-rate-analysis-embeddable',
    grouping: AIOPS_EMBEDDABLE_GROUPING,
    getIconType: () => 'logRateAnalysis',
    getDisplayName: () =>
      i18n.translate('xpack.aiops.embeddableLogRateAnalysisDisplayName', {
        defaultMessage: 'Log rate analysis',
      }),
    async isCompatible(context: EmbeddableApiContext) {
      return Boolean(await parentApiIsCompatible(context.embeddable));
    },
    async execute(context) {
      const presentationContainerParent = await parentApiIsCompatible(context.embeddable);
      if (!presentationContainerParent) throw new IncompatibleActionError();

      const uuid = v4();

      openLazyFlyout({
        core: coreStart,
        parentApi: context.embeddable,
        flyoutProps: {
          hideCloseButton: true,
          focusedPanelId: uuid,
          'data-test-subj': 'aiopsLogRateAnalysisEmbeddableInitializer',
          'aria-labelledby': 'logRateAnalysisConfig',
        },
        loadContent: async ({ closeFlyout }) => {
          const embeddable = await presentationContainerParent.addNewPanel<
            object,
            LogRateAnalysisEmbeddableApi
          >({
            panelType: EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE,
            serializedState: {},
            maybePanelId: uuid,
          });

          if (!embeddable) {
            return;
          }

          return (
            <EmbeddableLogRateAnalysisUserInput
              isNewPanel={true}
              pluginStart={pluginStart}
              logRateAnalysisControlsApi={embeddable}
              onConfirm={(updatedState) => {
                embeddable.updateUserInput(updatedState);
                closeFlyout();
              }}
              onCancel={() => {
                presentationContainerParent.removePanel(embeddable.uuid);
                closeFlyout();
              }}
            />
          );
        },
      });
    },
  };
}
