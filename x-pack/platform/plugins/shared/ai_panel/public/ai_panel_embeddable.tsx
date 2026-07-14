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
} from '@kbn/presentation-publishing';
import React, { useCallback, useEffect, useState } from 'react';
import { BehaviorSubject, map, merge, skip } from 'rxjs';
import type { AiPanelEmbeddableState } from '../server';
import { AI_PANEL_EMBEDDABLE_TYPE } from '../common/constants';
import { AiPanelComponent } from './components/ai_panel_component';

export type AiPanelApi = DefaultEmbeddableApi<AiPanelEmbeddableState>;

export const aiPanelEmbeddableFactory: EmbeddablePublicDefinition<
  AiPanelEmbeddableState,
  AiPanelApi
> = {
  type: AI_PANEL_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const titleManager = initializeTitleManager(initialState);
    const prompt$ = new BehaviorSubject<string>(initialState.prompt ?? '');
    const template$ = new BehaviorSubject<string | undefined>(initialState.template);

    const serializeState = (): AiPanelEmbeddableState => ({
      ...titleManager.getLatestState(),
      prompt: prompt$.getValue(),
      template: template$.getValue(),
    });

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
        template$.pipe(
          skip(1),
          map(() => undefined)
        )
      ),
      getComparators: () => ({
        ...titleComparators,
        prompt: 'referenceEquality',
        template: 'referenceEquality',
      }),
      applySerializedState: (lastSaved) => {
        titleManager.reinitializeState(lastSaved ?? {});
        prompt$.next(lastSaved?.prompt ?? '');
        template$.next(lastSaved?.template);
      },
    });

    const api = finalizeApi({
      ...stateApi,
      ...titleManager.api,
      serializeState,
      getTypeDisplayName: () => 'AI Panel',
    });

    return {
      api,
      Component: function AiPanelEmbeddableComponent() {
        const [prompt, savedTemplate] = useBatchedPublishingSubjects(prompt$, template$);
        const [generationVersion, setGenerationVersion] = useState(0);

        useEffect(() => {
          if (!apiPublishesReload(parentApi)) return;
          const sub = parentApi.reload$.subscribe(() => setGenerationVersion((v) => v + 1));
          return () => sub.unsubscribe();
        }, []);

        const onTemplateChange = useCallback((t: string) => {
          template$.next(t);
        }, []);

        return (
          <AiPanelComponent
            embeddableId={uuid}
            prompt={prompt}
            generationVersion={generationVersion}
            savedTemplate={savedTemplate}
            onTemplateChange={onTemplateChange}
          />
        );
      },
    };
  },
};
