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
import { EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis/constants';
import { AIOPS_EMBEDDABLE_GROUPING } from '@kbn/aiops-common/constants';
import type { LogRateAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/log_rate_analysis';

import type { LogRateAnalysisActionContext } from './log_rate_analysis_action_context';
import { LogRateAnalysisEmbeddableInitializer } from '../embeddables/log_rate_analysis/log_rate_analysis_embeddable_initializer';
import type { AiopsCoreSetup } from '../types';
import { canUseAiops } from '../capabilities';

const parentApiIsCompatible = async (
  parentApi: unknown
): Promise<PresentationContainer | undefined> => {
  const { apiIsPresentationContainer } = await import('@kbn/presentation-publishing');
  // we cannot have an async type check, so return the casted parentApi rather than a boolean
  return apiIsPresentationContainer(parentApi) ? (parentApi as PresentationContainer) : undefined;
};

export function createAddLogRateAnalysisEmbeddableAction(
  getStartServices: AiopsCoreSetup['getStartServices']
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
      const [coreStart] = await getStartServices();
      return Boolean(await parentApiIsCompatible(context.embeddable)) && canUseAiops(coreStart);
    },
    async execute(context) {
      const [[coreStart, pluginStart], presentationContainerParent] = await Promise.all([
        getStartServices(),
        parentApiIsCompatible(context.embeddable),
      ]);
      if (!presentationContainerParent) throw new IncompatibleActionError();

      openLazyFlyout({
        core: coreStart,
        parentApi: context.embeddable,
        returnFocus: context.returnFocus,
        flyoutProps: {
          hideCloseButton: true,
          focusedPanelId: context.embeddable.uuid,
          'data-test-subj': 'aiopsLogRateAnalysisEmbeddableInitializer',
          'aria-labelledby': 'logRateAnalysisConfig',
        },
        loadContent: async ({ closeFlyout }) => {
          return (
            <LogRateAnalysisEmbeddableInitializer
              dataViews={pluginStart.data.dataViews}
              IndexPatternSelect={pluginStart.unifiedSearch.ui.IndexPatternSelect}
              isNewPanel={true}
              onCreate={(initialState) => {
                presentationContainerParent.addNewPanel<LogRateAnalysisEmbeddableState>({
                  panelType: EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE,
                  serializedState: initialState,
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
