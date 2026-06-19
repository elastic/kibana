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
  initializeUnsavedChanges,
  useBatchedPublishingSubjects,
  apiPublishesReload,
  apiPublishesTimeRange,
  type HasEditCapabilities,
} from '@kbn/presentation-publishing';
import React, { useEffect, useState } from 'react';
import { BehaviorSubject, map, merge, skip } from 'rxjs';
import type { TimeRange } from '@kbn/es-query';
import type { AiSummaryPanelEmbeddableState } from '../server';
import { AI_SUMMARY_PANEL_EMBEDDABLE_TYPE } from '../common/constants';

type AiSummaryPanelApi = DefaultEmbeddableApi<AiSummaryPanelEmbeddableState> & HasEditCapabilities;
import { AiSummaryComponent } from './components/ai_summary_component';
import { EditAiPanelFlyout } from './components/edit_ai_panel_flyout';

export const aiSummaryPanelEmbeddableFactory: EmbeddablePublicDefinition<
  AiSummaryPanelEmbeddableState,
  AiSummaryPanelApi
> = {
  type: AI_SUMMARY_PANEL_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const titleManager = initializeTitleManager(initialState);
    const prompt$ = new BehaviorSubject<string>(initialState.prompt ?? '');
    const esqlQuery$ = new BehaviorSubject<string | undefined>(initialState.esqlQuery);
    const isEditFlyoutOpen$ = new BehaviorSubject<boolean>(false);

    const serializeState = (): AiSummaryPanelEmbeddableState => ({
      ...titleManager.getLatestState(),
      prompt: prompt$.getValue(),
      esqlQuery: esqlQuery$.getValue(),
    });

    const unsavedChangesApi = initializeUnsavedChanges<AiSummaryPanelEmbeddableState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        prompt$.pipe(
          skip(1),
          map(() => undefined)
        )
      ),
      getComparators: () => ({
        ...titleComparators,
        prompt: 'referenceEquality',
        esqlQuery: 'referenceEquality',
      }),
      onReset: (lastSaved) => {
        titleManager.reinitializeState(lastSaved ?? {});
        prompt$.next(lastSaved?.prompt ?? '');
        esqlQuery$.next(lastSaved?.esqlQuery);
      },
    });

    const api = finalizeApi({
      ...unsavedChangesApi,
      ...titleManager.api,
      serializeState,
      onEdit: async () => {
        isEditFlyoutOpen$.next(true);
      },
      isEditingEnabled: () => true,
      getTypeDisplayName: () => 'AI Panel',
    });

    return {
      api,
      Component: function AiSummaryPanelComponent() {
        const [title, hideTitle, prompt, esqlQuery, isEditFlyoutOpen] =
          useBatchedPublishingSubjects(
            titleManager.api.title$,
            titleManager.api.hideTitle$,
            prompt$,
            esqlQuery$,
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

        return (
          <>
            <AiSummaryComponent
              embeddableId={uuid}
              title={title}
              hideTitle={hideTitle}
              prompt={prompt}
              esqlQuery={esqlQuery}
              timeRange={timeRange}
              generationVersion={generationVersion}
            />
            {isEditFlyoutOpen && (
              <EditAiPanelFlyout
                prompt={prompt}
                esqlQuery={esqlQuery}
                timeRange={timeRange}
                onSave={(newPrompt, newEsqlQuery) => {
                  prompt$.next(newPrompt);
                  esqlQuery$.next(newEsqlQuery);
                  setGenerationVersion((v) => v + 1);
                }}
                onClose={() => isEditFlyoutOpen$.next(false)}
              />
            )}
          </>
        );
      },
    };
  },
};
