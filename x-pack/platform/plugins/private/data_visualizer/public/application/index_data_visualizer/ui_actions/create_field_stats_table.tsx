/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CoreStart } from '@kbn/core/public';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import type { FieldStatsTableEmbeddableState } from '@kbn/data-visualizer-server-schemas/embeddables/field_stats';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { openLazyFlyout } from '@kbn/presentation-util';
import { apiHasUniqueId } from '@kbn/presentation-publishing';
import type { EmbeddableApiContext, PresentationContainer } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import type { DataVisualizerStartDependencies } from '../../common/types/data_visualizer_plugin';
import type { FieldStatsInitialState } from '../../../../common/embeddables/types';
import { FieldStatsInitializerViewType } from '../../../../common/embeddables/types';
import { FIELD_STATS_EMBEDDABLE_TYPE } from '../../../../common/embeddables/constants';

const parentApiIsCompatible = async (
  parentApi: unknown
): Promise<PresentationContainer | undefined> => {
  const { apiIsPresentationContainer } = await import('@kbn/presentation-publishing');
  // we cannot have an async type check, so return the casted parentApi rather than a boolean
  return apiIsPresentationContainer(parentApi) ? (parentApi as PresentationContainer) : undefined;
};

const getDefaultInitialState = async (
  coreStart: CoreStart,
  pluginStart: DataVisualizerStartDependencies
): Promise<FieldStatsInitialState | undefined> => {
  const defaultDataView = await pluginStart.data.dataViews.getDefault();

  if (coreStart.uiSettings.get(ENABLE_ESQL)) {
    const indexPattern = defaultDataView?.getIndexPattern();
    return indexPattern
      ? {
          view_type: FieldStatsInitializerViewType.ESQL,
          query: { esql: `from ${indexPattern} | limit 10` },
        }
      : undefined;
  }

  return defaultDataView?.id
    ? {
        view_type: FieldStatsInitializerViewType.DATA_VIEW,
        data_view_id: defaultDataView.id,
      }
    : undefined;
};

const getSerializedState = (
  nextUpdate: FieldStatsInitialState
): FieldStatsTableEmbeddableState | undefined => {
  const showDistributions = nextUpdate.show_distributions ?? false;

  if (nextUpdate.view_type === FieldStatsInitializerViewType.ESQL && nextUpdate.query) {
    return {
      view_type: FieldStatsInitializerViewType.ESQL,
      query: nextUpdate.query,
      show_distributions: showDistributions,
    };
  }

  if (nextUpdate.view_type === FieldStatsInitializerViewType.DATA_VIEW && nextUpdate.data_view_id) {
    return {
      view_type: FieldStatsInitializerViewType.DATA_VIEW,
      data_view_id: nextUpdate.data_view_id,
      show_distributions: showDistributions,
    };
  }
};

export function createAddFieldStatsTableAction(
  coreStart: CoreStart,
  pluginStart: DataVisualizerStartDependencies
): UiActionsActionDefinition<EmbeddableApiContext> {
  return {
    id: 'create-field-stats-table',
    grouping: [ADD_PANEL_VISUALIZATION_GROUP],
    order: 10,
    getIconType: () => 'fieldStatistics',
    getDisplayName: () =>
      i18n.translate('xpack.dataVisualizer.fieldStatistics.displayName', {
        defaultMessage: 'Field statistics',
      }),
    async isCompatible(context: EmbeddableApiContext) {
      return Boolean(await parentApiIsCompatible(context.embeddable));
    },
    async execute(context) {
      const [presentationContainerParent, initialState] = await Promise.all([
        parentApiIsCompatible(context.embeddable),
        getDefaultInitialState(coreStart, pluginStart),
      ]);
      if (!presentationContainerParent) throw new IncompatibleActionError();

      openLazyFlyout({
        core: coreStart,
        parentApi: context.embeddable,
        flyoutProps: {
          hideCloseButton: true,
          focusedPanelId: apiHasUniqueId(context.embeddable) ? context.embeddable.uuid : undefined,
          'data-test-subj': 'fieldStatisticsInitializerFlyout',
        },
        loadContent: async ({ closeFlyout }) => {
          const { EmbeddableFieldStatsUserInput } = await import(
            '../embeddables/field_stats/field_stats_embeddable_input'
          );

          return (
            <EmbeddableFieldStatsUserInput
              coreStart={coreStart}
              pluginStart={pluginStart}
              isNewPanel={true}
              initialState={initialState}
              onUpdate={(nextUpdate) => {
                const serializedState = getSerializedState(nextUpdate);
                if (!serializedState) {
                  return;
                }

                presentationContainerParent.addNewPanel<FieldStatsTableEmbeddableState>({
                  panelType: FIELD_STATS_EMBEDDABLE_TYPE,
                  serializedState,
                });
              }}
              closeFlyout={closeFlyout}
            />
          );
        },
      });
    },
  };
}
