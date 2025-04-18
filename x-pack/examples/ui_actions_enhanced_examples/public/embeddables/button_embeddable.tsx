/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  DefaultEmbeddableApi,
  EmbeddableFactory,
  VALUE_CLICK_TRIGGER,
} from '@kbn/embeddable-plugin/public';
import { EuiCard, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { AdvancedUiActionsStart } from '@kbn/ui-actions-enhanced-plugin/public';
import {
  initializeTitleManager,
  initializeStateManager,
  titleComparators,
} from '@kbn/presentation-publishing';
import { map, merge } from 'rxjs';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { BUTTON_EMBEDDABLE } from './register_button_embeddable';

export const getButtonEmbeddableFactory = (uiActionsEnhanced: AdvancedUiActionsStart) => {
  const factory: EmbeddableFactory<{}, DefaultEmbeddableApi<{}>> = {
    type: BUTTON_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      const titleManager = initializeTitleManager(initialState.rawState);
      const buttonStateManager = initializeStateManager(initialState.rawState, {});
      function serializeState() {
        return {
          rawState: {
            ...titleManager.getLatestState(),
            ...buttonStateManager.getLatestState(),
          },
          references: [],
          // references: if this embeddable had any references - this is where we would extract them.
        };
      }
      const unsavedChangesApi = initializeUnsavedChanges({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          buttonStateManager.anyStateChange$
        ).pipe(map(() => undefined)),
        getComparators: () => {
          /**
           * comparators are provided in a callback to allow embeddables to change how their state is compared based
           * on the values of other state. For instance, if a saved object ID is present (by reference), the embeddable
           * may want to skip comparison of certain state.
           */
          return { ...titleComparators };
        },
        onReset: (lastSaved) => {
          /**
           * if this embeddable had a difference between its runtime and serialized state, we could run the 'deserializeState'
           * function here before resetting. onReset can be async so to support a potential async deserialize function.
           */

          titleManager.reinitializeState(lastSaved?.rawState);
          buttonStateManager.reinitializeState(lastSaved?.rawState);
        },
      });

      const api = finalizeApi({
        ...unsavedChangesApi,
        ...titleManager.api,
        serializeState,
      });
      return {
        api,
        Component: () => {
          const onClick = useCallback(() => {
            uiActionsEnhanced.getTrigger(VALUE_CLICK_TRIGGER).exec({
              embeddable: api,
              data: {
                data: [],
              },
            });
          }, []);
          return (
            <EuiFlexItem>
              <EuiCard
                icon={<EuiIcon size="xxl" type={`logoKibana`} />}
                title={`Click me!`}
                description={'This embeddable fires "VALUE_CLICK" trigger on click'}
                onClick={onClick}
              />
            </EuiFlexItem>
          );
        },
      };
    },
  };
  return factory;
};
