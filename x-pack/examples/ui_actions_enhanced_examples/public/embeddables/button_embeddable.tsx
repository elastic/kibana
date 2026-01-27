/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { DefaultEmbeddableApi, EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { VALUE_CLICK_TRIGGER } from '@kbn/embeddable-plugin/public';
import { EuiCard, EuiFlexItem, EuiIcon } from '@elastic/eui';
import type { AdvancedUiActionsStart } from '@kbn/ui-actions-enhanced-plugin/public';
import { BUTTON_EMBEDDABLE } from './register_button_embeddable';

export const getButtonEmbeddableFactory = (uiActionsEnhanced: AdvancedUiActionsStart) => {
  const factory: EmbeddableFactory<{}, DefaultEmbeddableApi<{}>> = {
    type: BUTTON_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      function serializeState() {
        return {};
      }

      const api = finalizeApi({
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
