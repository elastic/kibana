/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DefaultEmbeddableApi,
  EmbeddablePublicDefinition,
} from '@kbn/embeddable-plugin/public';
import {
  initializeTitleManager,
  titleComparators,
  initializeStateApi,
  useBatchedPublishingSubjects,
  apiPublishesReload,
  apiPublishesTimeRange,
  hasEditCapabilities,
  type HasEditCapabilities,
} from '@kbn/presentation-publishing';
import React, { useCallback, useEffect, useState } from 'react';
import { BehaviorSubject, map, merge, skip } from 'rxjs';
import type { TimeRange } from '@kbn/es-query';
import type { AiPanelEmbeddableState } from '../server';
import { AI_PANEL_EMBEDDABLE_TYPE } from '../common/constants';

export type AiPanelApi = DefaultEmbeddableApi<AiPanelEmbeddableState> & HasEditCapabilities;
import { AiPanelComponent } from './components/ai_panel_component';
import { EditAiPanelFlyout } from './components/edit_ai_panel_flyout';
import type { UpdateAiPanelConfigParams } from './utils/agent_refine';

export const aiPanelEmbeddableFactory: EmbeddablePublicDefinition<
  AiPanelEmbeddableState,
  AiPanelApi
> = {
  type: AI_PANEL_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const titleManager = initializeTitleManager(initialState);
    const prompt$ = new BehaviorSubject<string>(initialState.prompt ?? '');
    const esqlQuery$ = new BehaviorSubject<string | undefined>(initialState.esqlQuery);
    const template$ = new BehaviorSubject<string | undefined>(initialState.template);
    const isEditFlyoutOpen$ = new BehaviorSubject<boolean>(false);

    const serializeState = (): AiPanelEmbeddableState => ({
      ...titleManager.getLatestState(),
      prompt: prompt$.getValue(),
      esqlQuery: esqlQuery$.getValue(),
      template: template$.getValue(),
    });

    // Shared by the Save button and the agent's tool call; clears the cached template
    // whenever the prompt or query changes, since its schema may no longer match.
    const applyConfigUpdate = (update: {
      prompt?: string;
      esqlQuery?: string;
      template?: string;
    }) => {
      const promptChanged = update.prompt !== undefined && update.prompt !== prompt$.getValue();
      const queryChanged = 'esqlQuery' in update && update.esqlQuery !== esqlQuery$.getValue();

      if (update.prompt !== undefined) prompt$.next(update.prompt);
      if ('esqlQuery' in update) esqlQuery$.next(update.esqlQuery);

      if (promptChanged || queryChanged) {
        template$.next(undefined);
      } else if (update.template !== undefined) {
        template$.next(update.template);
      }
    };

    const stateApi = initializeStateApi<AiPanelEmbeddableState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        prompt$.pipe(
          skip(1),
          map(() => undefined)
        ),
        esqlQuery$.pipe(
          skip(1),
          map(() => undefined)
        ),
        template$.pipe(
          skip(1),
          map(() => undefined)
        )
      ),
      getComparators: () => ({
        ...titleComparators,
        prompt: 'referenceEquality',
        esqlQuery: 'referenceEquality',
        template: 'referenceEquality',
      }),
      applySerializedState: (lastSaved) => {
        titleManager.reinitializeState(lastSaved ?? {});
        prompt$.next(lastSaved?.prompt ?? '');
        esqlQuery$.next(lastSaved?.esqlQuery);
        template$.next(lastSaved?.template);
      },
    });

    const api = finalizeApi({
      ...stateApi,
      ...titleManager.api,
      serializeState,
      onEdit: async () => {
        isEditFlyoutOpen$.next(true);
      },
      isEditingEnabled: () =>
        hasEditCapabilities(parentApi) ? parentApi.isEditingEnabled() : true,
      getTypeDisplayName: () => 'AI Panel',
    });

    return {
      api,
      Component: function AiPanelEmbeddableComponent() {
        const [prompt, esqlQuery, savedTemplate, isEditFlyoutOpen] = useBatchedPublishingSubjects(
          prompt$,
          esqlQuery$,
          template$,
          isEditFlyoutOpen$
        );

        const [generationVersion, setGenerationVersion] = useState(0);
        const [timeRange, setTimeRange] = useState<TimeRange | undefined>(
          apiPublishesTimeRange(parentApi)
            ? parentApi.timeRange$.getValue() ?? undefined
            : undefined
        );

        useEffect(() => {
          if (!apiPublishesReload(parentApi)) return;
          const sub = parentApi.reload$.subscribe(() => {
            setGenerationVersion((v) => v + 1);
          });
          return () => sub.unsubscribe();
        }, []);

        useEffect(() => {
          if (!apiPublishesTimeRange(parentApi)) return;
          const sub = parentApi.timeRange$.subscribe((tr) => setTimeRange(tr ?? undefined));
          return () => sub.unsubscribe();
        }, []);

        const onTemplateChange = useCallback((t: string) => {
          template$.next(t);
        }, []);

        const onSave = useCallback(
          (newEsqlQuery: string | undefined, newTemplate: string | undefined) => {
            applyConfigUpdate({ esqlQuery: newEsqlQuery, template: newTemplate });
            setGenerationVersion((v) => v + 1);
          },
          []
        );

        const onAgentUpdate = useCallback((update: UpdateAiPanelConfigParams) => {
          applyConfigUpdate(update);
          setGenerationVersion((v) => v + 1);
        }, []);

        return (
          <>
            <AiPanelComponent
              embeddableId={uuid}
              prompt={prompt}
              esqlQuery={esqlQuery}
              timeRange={timeRange}
              generationVersion={generationVersion}
              savedTemplate={savedTemplate}
              onTemplateChange={onTemplateChange}
            />
            {isEditFlyoutOpen && (
              <EditAiPanelFlyout
                embeddableId={uuid}
                prompt={prompt}
                esqlQuery={esqlQuery}
                template={savedTemplate}
                timeRange={timeRange}
                onSave={onSave}
                onAgentUpdate={onAgentUpdate}
                onClose={() => isEditFlyoutOpen$.next(false)}
              />
            )}
          </>
        );
      },
    };
  },
};
