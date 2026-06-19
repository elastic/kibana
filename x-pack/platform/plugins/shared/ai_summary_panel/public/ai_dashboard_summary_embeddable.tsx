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
  type HasEditCapabilities,
} from '@kbn/presentation-publishing';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BehaviorSubject, map, merge, skip } from 'rxjs';
import type { TimeRange } from '@kbn/es-query';
import type { AiDashboardSummaryEmbeddableState } from '../server';
import { AI_DASHBOARD_SUMMARY_EMBEDDABLE_TYPE } from '../common/constants';
import { extractEsqlQuery } from './utils/sibling_panels';
import { AiDashboardSummaryComponent } from './components/ai_dashboard_summary_component';

type AiDashboardSummaryApi = DefaultEmbeddableApi<AiDashboardSummaryEmbeddableState> &
  HasEditCapabilities;

export const aiDashboardSummaryEmbeddableFactory: EmbeddablePublicDefinition<
  AiDashboardSummaryEmbeddableState,
  AiDashboardSummaryApi
> = {
  type: AI_DASHBOARD_SUMMARY_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const titleManager = initializeTitleManager(initialState);
    const customInstructions$ = new BehaviorSubject<string | undefined>(
      initialState.customInstructions
    );
    const template$ = new BehaviorSubject<string | undefined>(initialState.template);

    const serializeState = (): AiDashboardSummaryEmbeddableState => ({
      ...titleManager.getLatestState(),
      customInstructions: customInstructions$.getValue(),
      template: template$.getValue(),
    });

    const stateApi = initializeStateApi<AiDashboardSummaryEmbeddableState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        customInstructions$.pipe(
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
        customInstructions: 'referenceEquality',
        template: 'referenceEquality',
      }),
      applySerializedState: (lastSaved) => {
        titleManager.reinitializeState(lastSaved ?? {});
        customInstructions$.next(lastSaved?.customInstructions);
        template$.next(lastSaved?.template);
      },
    });

    const api = finalizeApi({
      ...stateApi,
      ...titleManager.api,
      serializeState,
      onEdit: async () => {},
      isEditingEnabled: () => false,
      getTypeDisplayName: () => 'AI Dashboard Summary',
    });

    return {
      api,
      Component: function AiDashboardSummaryPanelComponent() {
        const [title, hideTitle, customInstructions, savedTemplate] = useBatchedPublishingSubjects(
          titleManager.api.title$,
          titleManager.api.hideTitle$,
          customInstructions$,
          template$
        );

        const [generationVersion, setGenerationVersion] = useState(0);
        const [timeRange, setTimeRange] = useState<TimeRange | undefined>(
          apiPublishesTimeRange(parentApi)
            ? parentApi.timeRange$.getValue() ?? undefined
            : undefined
        );

        useEffect(() => {
          if (!apiPublishesReload(parentApi)) return;
          const sub = parentApi.reload$.subscribe(() => setGenerationVersion((v) => v + 1));
          return () => sub.unsubscribe();
        }, []);

        // Watch sibling panels — clear template when the set of ES|QL-bearing panels changes
        // (panel added, removed, or query edited) so the summary regenerates automatically.
        const prevSiblingSignatureRef = useRef<string | null>(null);
        useEffect(() => {
          const pa = parentApi as Record<string, unknown> | null;
          const children$ = pa?.children$ as
            | {
                subscribe: (fn: (v: Record<string, unknown>) => void) => {
                  unsubscribe: () => void;
                };
              }
            | undefined;
          if (!children$) return;

          const sub = children$.subscribe((children) => {
            // Build a signature from sorted ES|QL query strings only — deliberately
            // excluding panel IDs so that a page reload (which reassigns UUIDs) does
            // not spuriously invalidate a still-valid saved template.
            const signature = Object.entries(children)
              .filter(([id]) => id !== uuid)
              .flatMap(([, childApi]) => {
                const q = extractEsqlQuery(childApi);
                return q ? [q] : [];
              })
              .sort()
              .join('|');

            if (
              prevSiblingSignatureRef.current !== null &&
              prevSiblingSignatureRef.current !== signature
            ) {
              template$.next(undefined);
            }
            prevSiblingSignatureRef.current = signature;
          });

          return () => sub.unsubscribe();
        }, []); // parentApi and uuid are stable for the lifetime of the embeddable

        useEffect(() => {
          if (!apiPublishesTimeRange(parentApi)) return;
          const sub = parentApi.timeRange$.subscribe((tr) => setTimeRange(tr ?? undefined));
          return () => sub.unsubscribe();
        }, []);

        const onTemplateChange = useCallback((t: string) => {
          template$.next(t);
        }, []);

        return (
          <AiDashboardSummaryComponent
            embeddableId={uuid}
            title={title}
            hideTitle={hideTitle}
            parentApi={parentApi}
            customInstructions={customInstructions}
            timeRange={timeRange}
            generationVersion={generationVersion}
            savedTemplate={savedTemplate}
            onTemplateChange={onTemplateChange}
          />
        );
      },
    };
  },
};
