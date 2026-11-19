/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiLoadingChart } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type {
  DefaultEmbeddableApi,
  EmbeddablePublicDefinition,
} from '@kbn/embeddable-plugin/public';
import {
  fetch$,
  initializeStateApi,
  initializeStateManager,
  initializeTimeRangeManager,
  initializeTitleManager,
  timeRangeComparators,
  titleComparators,
  useBatchedPublishingSubjects,
  type HasEditCapabilities,
  type HasTypeDisplayName,
  type PublishesBlockingError,
  type PublishesDataLoading,
  type PublishesDataSources,
  type PublishesWritableTimeRange,
  type StateComparators,
  type WithAllKeys,
} from '@kbn/presentation-publishing';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  defer,
  EMPTY,
  finalize,
  from,
  map,
  merge,
  of,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';
import {
  DEFAULT_AUTO_ROTATE,
  DEFAULT_BACKGROUND,
  DEFAULT_CLUSTER_DETAIL,
  DEFAULT_FOG_STRENGTH,
  DEFAULT_MIN_DIST,
  DEFAULT_N_NEIGHBORS,
  DEFAULT_POINT_SIZE,
  DEFAULT_SAMPLE_SIZE,
  DEFAULT_SHOW_LABELS,
  VECTOR_PROJECTION_EMBEDDABLE_TYPE,
} from '../../common/constants';
import type { VectorProjectionEmbeddableState } from '../../server';
import { ProjectionView } from '../components/projection_view';
import { openEditorFlyout } from '../components/open_editor_flyout';
import { getServices } from '../services';
import type { VectorProjectionConfig } from '../types';
import { fetchVectorSample } from './fetch_vector_sample';
import type { VectorSample } from './vector_sample';

/** UMAP needs more points than neighbors; below this the projection is meaningless. */
const MIN_VECTORS = 5;

export type VectorProjectionApi = DefaultEmbeddableApi<VectorProjectionEmbeddableState> &
  HasEditCapabilities &
  HasTypeDisplayName &
  PublishesBlockingError &
  PublishesDataLoading &
  PublishesDataSources<DataView> &
  PublishesWritableTimeRange;

const defaultConfig: WithAllKeys<VectorProjectionConfig> = {
  data_view_id: '',
  vector_field: '',
  label_field: undefined,
  sample_size: DEFAULT_SAMPLE_SIZE,
  dimensions: 2,
  n_neighbors: DEFAULT_N_NEIGHBORS,
  min_dist: DEFAULT_MIN_DIST,
  cluster_detail: DEFAULT_CLUSTER_DETAIL,
  point_size: DEFAULT_POINT_SIZE,
  fog_strength: DEFAULT_FOG_STRENGTH,
  background: DEFAULT_BACKGROUND,
  auto_rotate: DEFAULT_AUTO_ROTATE,
  show_labels: DEFAULT_SHOW_LABELS,
};

const configComparators: StateComparators<VectorProjectionConfig> = {
  data_view_id: 'referenceEquality',
  vector_field: 'referenceEquality',
  label_field: 'referenceEquality',
  sample_size: 'referenceEquality',
  dimensions: 'referenceEquality',
  n_neighbors: 'referenceEquality',
  min_dist: 'referenceEquality',
  cluster_detail: 'referenceEquality',
  point_size: 'referenceEquality',
  fog_strength: 'referenceEquality',
  background: 'referenceEquality',
  auto_rotate: 'referenceEquality',
  show_labels: 'referenceEquality',
};

/** Fills settings added after a panel was saved, since an explicit `undefined` would hide the default. */
const pickConfig = ({
  data_view_id: dataViewId,
  vector_field: vectorField,
  label_field: labelField,
  sample_size: sampleSize,
  dimensions,
  n_neighbors: nNeighbors,
  min_dist: minDist,
  cluster_detail: clusterDetail,
  point_size: pointSize,
  fog_strength: fogStrength,
  background,
  auto_rotate: autoRotate,
  show_labels: showLabels,
}: VectorProjectionEmbeddableState): VectorProjectionConfig => ({
  data_view_id: dataViewId,
  vector_field: vectorField,
  label_field: labelField,
  sample_size: sampleSize,
  dimensions,
  n_neighbors: nNeighbors,
  min_dist: minDist,
  cluster_detail: clusterDetail ?? DEFAULT_CLUSTER_DETAIL,
  point_size: pointSize ?? DEFAULT_POINT_SIZE,
  fog_strength: fogStrength ?? DEFAULT_FOG_STRENGTH,
  background: background ?? DEFAULT_BACKGROUND,
  auto_rotate: autoRotate ?? DEFAULT_AUTO_ROTATE,
  show_labels: showLabels ?? DEFAULT_SHOW_LABELS,
});

export const vectorProjectionEmbeddableFactory: EmbeddablePublicDefinition<
  VectorProjectionEmbeddableState,
  VectorProjectionApi
> = {
  type: VECTOR_PROJECTION_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const services = getServices();
    const titleManager = initializeTitleManager(initialState);
    const timeRangeManager = initializeTimeRangeManager(initialState);
    const configManager = initializeStateManager<VectorProjectionConfig>(
      pickConfig(initialState),
      defaultConfig,
      configComparators
    );

    const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
    const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
    const dataSources$ = new BehaviorSubject<DataView[] | undefined>(undefined);
    const sample$ = new BehaviorSubject<VectorSample | undefined>(undefined);

    const serializeState = (): VectorProjectionEmbeddableState => ({
      ...titleManager.getLatestState(),
      ...timeRangeManager.getLatestState(),
      ...configManager.getLatestState(),
    });

    const stateApi = initializeStateApi<VectorProjectionEmbeddableState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        timeRangeManager.anyStateChange$,
        configManager.anyStateChange$
      ),
      getComparators: () => ({
        ...titleComparators,
        ...timeRangeComparators,
        ...configComparators,
      }),
      applySerializedState: (lastSaved) => {
        titleManager.reinitializeState(lastSaved);
        timeRangeManager.reinitializeState(lastSaved);
        configManager.reinitializeState(pickConfig(lastSaved));
      },
    });

    const api = finalizeApi({
      ...stateApi,
      ...titleManager.api,
      ...timeRangeManager.api,
      serializeState,
      dataLoading$,
      blockingError$,
      dataSources$,
      getTypeDisplayName: () =>
        i18n.translate('xpack.vectorProjection.embeddable.typeDisplayName', {
          defaultMessage: 'vector projection',
        }),
      isEditingEnabled: () => true,
      onEdit: async ({ returnFocus } = {}) => {
        openEditorFlyout({
          parentApi,
          initialConfig: configManager.getLatestState(),
          isNewPanel: false,
          focusedPanelId: uuid,
          returnFocus,
          onSave: (config) => configManager.reinitializeState(config),
        });
      },
    });

    const { dataViewId$, vectorField$, labelField$, sampleSize$ } = configManager.api;

    const dataView$ = dataViewId$.pipe(
      switchMap((id) =>
        from(services.dataViews.get(id)).pipe(
          catchError((error: Error) => {
            blockingError$.next(error);
            return of(undefined);
          })
        )
      ),
      tap((dataView) => dataSources$.next(dataView ? [dataView] : undefined))
    );

    const subscriptions = new Subscription();
    subscriptions.add(
      combineLatest([fetch$(api), dataView$, vectorField$, labelField$, sampleSize$])
        .pipe(
          switchMap(([fetchContext, dataView, vectorField, labelField, sampleSize]) => {
            if (!dataView) return EMPTY;
            dataLoading$.next(true);
            blockingError$.next(undefined);
            return defer(() => {
              const abortController = new AbortController();
              return from(
                fetchVectorSample(
                  services,
                  dataView,
                  { vector_field: vectorField, label_field: labelField, sample_size: sampleSize },
                  fetchContext,
                  abortController.signal
                )
              ).pipe(finalize(() => abortController.abort()));
            }).pipe(
              map((sample) => ({ sample })),
              catchError((error: Error) => of({ error }))
            );
          })
        )
        .subscribe((result) => {
          if ('error' in result) {
            if (result.error.name === 'AbortError') return;
            dataLoading$.next(false);
            blockingError$.next(result.error);
            return;
          }
          if (result.sample.vectors.length < MIN_VECTORS) dataLoading$.next(false);
          sample$.next(result.sample);
        })
    );

    return {
      api,
      Component: function VectorProjectionComponent() {
        const [
          sample,
          dimensions,
          nNeighbors,
          minDist,
          clusterDetail,
          pointSize,
          fogStrength,
          background,
          autoRotate,
          showLabels,
          vectorField,
        ] = useBatchedPublishingSubjects(
          sample$,
          configManager.api.dimensions$,
          configManager.api.nNeighbors$,
          configManager.api.minDist$,
          configManager.api.clusterDetail$,
          configManager.api.pointSize$,
          configManager.api.fogStrength$,
          configManager.api.background$,
          configManager.api.autoRotate$,
          configManager.api.showLabels$,
          vectorField$
        );

        useEffect(() => () => subscriptions.unsubscribe(), []);

        const onRenderComplete = useCallback(() => dataLoading$.next(false), []);
        const onError = useCallback((error: Error) => {
          dataLoading$.next(false);
          blockingError$.next(error);
        }, []);

        if (!sample) {
          return (
            <EuiFlexGroup
              alignItems="center"
              justifyContent="center"
              css={css`
                height: 100%;
              `}
            >
              <EuiLoadingChart size="l" />
            </EuiFlexGroup>
          );
        }

        if (sample.vectors.length < MIN_VECTORS) {
          return (
            <EuiEmptyPrompt
              iconType="visualizeApp"
              titleSize="xs"
              title={
                <h3>
                  {i18n.translate('xpack.vectorProjection.embeddable.noVectorsTitle', {
                    defaultMessage: 'Not enough vectors to project',
                  })}
                </h3>
              }
              body={i18n.translate('xpack.vectorProjection.embeddable.noVectorsBody', {
                defaultMessage:
                  'Found {count} documents with a value for {field}. Widen the time range or filters to include at least {min}.',
                values: { count: sample.vectors.length, field: vectorField, min: MIN_VECTORS },
              })}
              data-test-subj="vectorProjectionNoVectors"
            />
          );
        }

        return (
          <ProjectionView
            sample={sample}
            dimensions={dimensions}
            nNeighbors={nNeighbors}
            minDist={minDist}
            clusterDetail={clusterDetail}
            pointSize={pointSize}
            fogStrength={fogStrength}
            background={background}
            autoRotate={autoRotate}
            showLabels={showLabels}
            onRenderComplete={onRenderComplete}
            onError={onError}
          />
        );
      },
    };
  },
};
