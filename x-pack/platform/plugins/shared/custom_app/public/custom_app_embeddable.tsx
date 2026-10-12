/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject, map, skip } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type {
  DefaultEmbeddableApi,
  EmbeddablePublicDefinition,
} from '@kbn/embeddable-plugin/public';
import {
  initializeStateApi,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
  type HasTypeDisplayName,
} from '@kbn/presentation-publishing';
import {
  CUSTOM_APP_EMBEDDABLE_TYPE,
  CUSTOM_APP_STATE_VERSION,
  type AppDocument,
} from '@kbn/custom-app-common';
import type { CustomAppEmbeddableState } from '../server';
import { NodeRenderer } from './components/node_renderer';

export type CustomAppApi = DefaultEmbeddableApi<CustomAppEmbeddableState> & HasTypeDisplayName;

export const customAppEmbeddableFactory: EmbeddablePublicDefinition<
  CustomAppEmbeddableState,
  CustomAppApi
> = {
  type: CUSTOM_APP_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const titleManager = initializeTitleManager(initialState);
    const document$ = new BehaviorSubject<AppDocument>(initialState.document);

    const serializeState = (): CustomAppEmbeddableState => ({
      ...titleManager.getLatestState(),
      version: CUSTOM_APP_STATE_VERSION,
      document: document$.getValue(),
    });

    const stateApi = initializeStateApi<CustomAppEmbeddableState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: document$.pipe(
        skip(1),
        map(() => undefined)
      ),
      getComparators: () => ({
        ...titleComparators,
        version: 'skip',
        document: 'deepEquality',
      }),
      applySerializedState: (lastSaved) => {
        titleManager.reinitializeState(lastSaved ?? {});
        if (lastSaved) document$.next(lastSaved.document);
      },
    });

    const api = finalizeApi({
      ...stateApi,
      ...titleManager.api,
      serializeState,
      getTypeDisplayName: () =>
        i18n.translate('xpack.customApp.embeddable.typeDisplayName', {
          defaultMessage: 'Custom app',
        }),
    });

    return {
      api,
      Component: function CustomAppEmbeddableComponent() {
        const [document] = useBatchedPublishingSubjects(document$);
        return <NodeRenderer node={document.root} />;
      },
    };
  },
};
