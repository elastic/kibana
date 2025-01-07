/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PresentationContainer } from '@kbn/presentation-containers';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { EMBEDDABLE_PATTERN_ANALYSIS_TYPE } from '@kbn/aiops-log-pattern-analysis/constants';
import { AIOPS_EMBEDDABLE_GROUPING } from '@kbn/aiops-common/constants';

import type { AiopsPluginStartDeps } from '../types';
import type {
  PatternAnalysisEmbeddableApi,
  PatternAnalysisEmbeddableInitialState,
} from '../embeddables/pattern_analysis/types';

import type { PatternAnalysisActionContext } from './pattern_analysis_action_context';

const parentApiIsCompatible = async (
  parentApi: unknown
): Promise<PresentationContainer | undefined> => {
  const { apiIsPresentationContainer } = await import('@kbn/presentation-containers');
  // we cannot have an async type check, so return the casted parentApi rather than a boolean
  return apiIsPresentationContainer(parentApi) ? (parentApi as PresentationContainer) : undefined;
};

export function createAddPatternAnalysisEmbeddableAction(
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps
): UiActionsActionDefinition<PatternAnalysisActionContext> {
  return {
    id: 'create-pattern-analysis-embeddable',
    grouping: AIOPS_EMBEDDABLE_GROUPING,
    getIconType: () => 'logPatternAnalysis',
    getDisplayName: () =>
      i18n.translate('xpack.aiops.embeddablePatternAnalysisDisplayName', {
        defaultMessage: 'Pattern analysis',
      }),
    async isCompatible(context: EmbeddableApiContext) {
      return Boolean(await parentApiIsCompatible(context.embeddable));
    },
    async execute(context) {
      const presentationContainerParent = await parentApiIsCompatible(context.embeddable);
      if (!presentationContainerParent) throw new IncompatibleActionError();

      try {
        const { resolveEmbeddablePatternAnalysisUserInput } = await import(
          '../embeddables/pattern_analysis/resolve_pattern_analysis_config_input'
        );

        const initialState: PatternAnalysisEmbeddableInitialState = {
          dataViewId: undefined,
        };

        const embeddable = await presentationContainerParent.addNewPanel<
          object,
          PatternAnalysisEmbeddableApi
        >({
          panelType: EMBEDDABLE_PATTERN_ANALYSIS_TYPE,
          initialState,
        });

        if (!embeddable) {
          return;
        }

        const deletePanel = () => {
          presentationContainerParent.removePanel(embeddable.uuid);
        };

        resolveEmbeddablePatternAnalysisUserInput(
          coreStart,
          pluginStart,
          context.embeddable,
          embeddable.uuid,
          true,
          embeddable,
          deletePanel
        );
      } catch (e) {
        return Promise.reject();
      }
    },
  };
}
