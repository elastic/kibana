/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { PresentationContainer } from '@kbn/presentation-publishing';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { EMBEDDABLE_PATTERN_ANALYSIS_TYPE } from '@kbn/aiops-log-pattern-analysis/constants';
import { AIOPS_EMBEDDABLE_GROUPING } from '@kbn/aiops-common/constants';
import type { PatternAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';

import type { PatternAnalysisActionContext } from './pattern_analysis_action_context';
import type { AiopsCoreSetup } from '../types';
import { canUseAiops } from '../capabilities';
import { AiopsAppContext } from '../hooks/use_aiops_app_context';

const parentApiIsCompatible = async (
  parentApi: unknown
): Promise<PresentationContainer | undefined> => {
  const { apiIsPresentationContainer } = await import('@kbn/presentation-publishing');
  // we cannot have an async type check, so return the casted parentApi rather than a boolean
  return apiIsPresentationContainer(parentApi) ? (parentApi as PresentationContainer) : undefined;
};

export function createAddPatternAnalysisEmbeddableAction(
  getStartServices: AiopsCoreSetup['getStartServices']
): UiActionsActionDefinition<PatternAnalysisActionContext> {
  return {
    id: 'create-pattern-analysis-embeddable',
    grouping: AIOPS_EMBEDDABLE_GROUPING,
    getIconType: () => 'pattern',
    getDisplayName: () =>
      i18n.translate('xpack.aiops.embeddablePatternAnalysisDisplayName', {
        defaultMessage: 'Pattern analysis',
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
        flyoutProps: {
          hideCloseButton: true,
          focusedPanelId: context.embeddable.uuid,
          'data-test-subj': 'aiopsPatternAnalysisEmbeddableInitializer',
          'aria-labelledby': 'patternAnalysisConfig',
        },
        loadContent: async ({ closeFlyout }) => {
          const { PatternAnalysisEmbeddableInitializer } = await import(
            '../embeddables/pattern_analysis/pattern_analysis_initializer'
          );

          return (
            <AiopsAppContext.Provider
              value={{
                embeddingOrigin: 'flyout',
                ...coreStart,
                ...pluginStart,
              }}
            >
              <PatternAnalysisEmbeddableInitializer
                onCreate={(initialState: PatternAnalysisEmbeddableState) => {
                  presentationContainerParent.addNewPanel<PatternAnalysisEmbeddableState>({
                    panelType: EMBEDDABLE_PATTERN_ANALYSIS_TYPE,
                    serializedState: initialState,
                  });
                  closeFlyout();
                }}
                onCancel={closeFlyout}
                isNewPanel={true}
              />
            </AiopsAppContext.Provider>
          );
        },
      });
    },
  };
}
