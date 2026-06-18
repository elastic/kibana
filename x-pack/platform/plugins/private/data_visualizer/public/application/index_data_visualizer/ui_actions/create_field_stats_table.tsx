/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CoreStart } from '@kbn/core/public';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { openLazyFlyout } from '@kbn/presentation-util';
import { apiHasUniqueId } from '@kbn/presentation-publishing';
import type { EmbeddableApiContext, PresentationContainer } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import type { DataVisualizerStartDependencies } from '../../common/types/data_visualizer_plugin';
import type {
  FieldStatisticsTableEmbeddableState,
  FieldStatsInitialState,
} from '../../../../common/embeddables/types';
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
          viewType: FieldStatsInitializerViewType.ESQL,
          query: { esql: `from ${indexPattern} | limit 10` },
        }
      : undefined;
  }

  return defaultDataView?.id
    ? {
        viewType: FieldStatsInitializerViewType.DATA_VIEW,
        dataViewId: defaultDataView.id,
      }
    : undefined;
};

const getSerializedState = (
  nextUpdate: FieldStatsInitialState
): FieldStatisticsTableEmbeddableState | undefined => {
  const showDistributions = nextUpdate.showDistributions ?? false;

  if (nextUpdate.viewType === FieldStatsInitializerViewType.ESQL && nextUpdate.query) {
    return {
      viewType: FieldStatsInitializerViewType.ESQL,
      query: nextUpdate.query,
      showDistributions,
    };
  }

  if (nextUpdate.viewType === FieldStatsInitializerViewType.DATA_VIEW && nextUpdate.dataViewId) {
    return {
      viewType: FieldStatsInitializerViewType.DATA_VIEW,
      dataViewId: nextUpdate.dataViewId,
      showDistributions,
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

                presentationContainerParent.addNewPanel<FieldStatisticsTableEmbeddableState>({
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
