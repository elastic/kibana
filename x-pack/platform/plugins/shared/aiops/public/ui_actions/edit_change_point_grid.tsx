/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  CHANGE_POINT_GRID_EMBEDDABLE_TYPE,
  type ChangePointGridConfiguration,
  type ChangePointGridFormConfiguration,
} from '@kbn/discover-utils';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasType,
  apiHasUniqueId,
  apiIsOfType,
  apiPublishesEsql,
  apiPublishesTimeRange,
  apiPublishesWritableTitle,
  getInheritedViewMode,
  getViewModeSubject,
  type CanAccessViewMode,
  type EmbeddableApiContext,
  type HasParentApi,
  type HasType,
  type HasUniqueId,
  type PublishesEsql,
  type PublishesTimeRange,
  type PublishesWritableTitle,
  type PublishingSubject,
} from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import { map, merge } from 'rxjs';
import { canUseAiops } from '../capabilities';
import {
  isChangePointMetricField,
  isChangePointSplitField,
  isEsqlCompatibleField,
} from '../components/change_point_detection/change_point_field_utils';
import type { AiopsCoreSetup } from '../types';

export const EDIT_CHANGE_POINT_GRID_ACTION_ID = 'edit-change-point-grid';

export type EditableChangePointGridApi = HasType &
  CanAccessViewMode &
  PublishesEsql &
  PublishesWritableTitle &
  Partial<HasUniqueId & HasParentApi & PublishesTimeRange> & {
    configuration$: PublishingSubject<ChangePointGridConfiguration | undefined>;
    updateChangePointQuery: (update: {
      esql: string;
      configuration: ChangePointGridConfiguration | undefined;
    }) => void;
  };

const isPublishingConfigurationSubject = (
  value: unknown
): value is PublishingSubject<ChangePointGridConfiguration | undefined> => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<PublishingSubject<ChangePointGridConfiguration | undefined>>;
  return typeof candidate.getValue === 'function' && typeof candidate.pipe === 'function';
};

/**
 * Checks whether an embeddable API structurally exposes the change_point_grid configuration
 * and in-place query update contract without importing runtime types from Discover.
 */
export const isEditableChangePointGridApi = (api: unknown): api is EditableChangePointGridApi => {
  if (
    !apiHasType(api) ||
    !apiIsOfType(api, CHANGE_POINT_GRID_EMBEDDABLE_TYPE) ||
    !apiCanAccessViewMode(api) ||
    !apiPublishesEsql(api) ||
    !apiPublishesWritableTitle(api)
  ) {
    return false;
  }

  const candidate = api as Partial<EditableChangePointGridApi>;
  return (
    isPublishingConfigurationSubject(candidate.configuration$) &&
    typeof candidate.updateChangePointQuery === 'function'
  );
};

interface ResolvedEditModeState {
  readonly initialMode: 'form' | 'esql';
  readonly initialFormConfiguration?: ChangePointGridFormConfiguration;
  readonly initialEsql: string;
}

const resolveEditModeState = async ({
  configuration,
  currentEsql,
  dataViews,
}: {
  readonly configuration: ChangePointGridConfiguration;
  readonly currentEsql: string;
  readonly dataViews: DataViewsPublicPluginStart;
}): Promise<ResolvedEditModeState> => {
  if (configuration.mode !== 'form') {
    return {
      initialMode: 'esql',
      initialEsql: currentEsql,
    };
  }

  const { buildChangePointEsql } = await import(
    '../embeddables/change_point_chart/build_change_point_esql'
  );

  try {
    const dataView = await dataViews.get(configuration.data_view_id);
    if (!dataView.isTimeBased() || !dataView.timeFieldName) {
      return { initialMode: 'esql', initialEsql: currentEsql };
    }

    const hasCompatibleMetricField = dataView.fields.some(
      (field) =>
        field.name === configuration.metric_field &&
        isChangePointMetricField(field) &&
        isEsqlCompatibleField(field)
    );
    if (!hasCompatibleMetricField) {
      return { initialMode: 'esql', initialEsql: currentEsql };
    }

    if (configuration.split_field) {
      const hasCompatibleSplitField = dataView.fields.some(
        (field) =>
          field.name === configuration.split_field &&
          isChangePointSplitField(field) &&
          isEsqlCompatibleField(field)
      );
      if (!hasCompatibleSplitField) {
        return { initialMode: 'esql', initialEsql: currentEsql };
      }
    }

    const regeneratedEsql = buildChangePointEsql({
      indexPattern: dataView.getIndexPattern(),
      timeField: dataView.timeFieldName,
      aggregationFunction: configuration.aggregation_function,
      metricField: configuration.metric_field,
      splitField: configuration.split_field,
      partitions: configuration.partitions,
    });

    if (regeneratedEsql === currentEsql) {
      return {
        initialMode: 'form',
        initialFormConfiguration: configuration,
        initialEsql: currentEsql,
      };
    }
  } catch {
    // Missing or inaccessible data view falls back to direct-edit mode with the saved query.
  }

  return {
    initialMode: 'esql',
    initialEsql: currentEsql,
  };
};

const getEditChangePointGridContext = async (
  embeddable: unknown,
  getStartServices: AiopsCoreSetup['getStartServices']
) => {
  if (
    !isEditableChangePointGridApi(embeddable) ||
    !embeddable.configuration$.getValue() ||
    getInheritedViewMode(embeddable) !== 'edit'
  ) {
    return undefined;
  }

  const [coreStart, pluginStart] = await getStartServices();
  if (!coreStart.uiSettings.get<boolean>(ENABLE_ESQL) || !canUseAiops(coreStart)) {
    return undefined;
  }

  return { embeddable, coreStart, pluginStart };
};

/** Creates the Dashboard panel-menu action for editing AIOps-configured change_point_grid panels. */
export const createEditChangePointGridAction = (
  getStartServices: AiopsCoreSetup['getStartServices']
): UiActionsActionDefinition<EmbeddableApiContext> => ({
  id: EDIT_CHANGE_POINT_GRID_ACTION_ID,
  type: EDIT_CHANGE_POINT_GRID_ACTION_ID,
  order: 50,
  getIconType: () => 'pencil',
  getDisplayName: () =>
    i18n.translate('xpack.aiops.actions.editChangePointGridDisplayName', {
      defaultMessage: 'Edit change point detection',
    }),
  couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return isEditableChangePointGridApi(embeddable);
  },
  getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    if (!isEditableChangePointGridApi(embeddable)) {
      return undefined;
    }
    const viewMode$ = getViewModeSubject(embeddable);
    return (
      viewMode$ ? merge(viewMode$, embeddable.configuration$) : embeddable.configuration$
    ).pipe(map(() => undefined));
  },
  async isCompatible({ embeddable }: EmbeddableApiContext) {
    return Boolean(await getEditChangePointGridContext(embeddable, getStartServices));
  },
  async execute({ embeddable: contextEmbeddable, returnFocus }: EmbeddableApiContext) {
    const editContext = await getEditChangePointGridContext(contextEmbeddable, getStartServices);
    if (!editContext) {
      throw new IncompatibleActionError();
    }
    const { embeddable, coreStart, pluginStart } = editContext;

    const dashboardParentApi = apiHasParentApi(embeddable) ? embeddable.parentApi : undefined;
    const focusedPanelId = apiHasUniqueId(embeddable) ? embeddable.uuid : undefined;

    openLazyFlyout({
      core: coreStart,
      parentApi: dashboardParentApi,
      returnFocus,
      flyoutProps: {
        'data-test-subj': 'aiopsChangePointChartEmbeddableInitializer',
        'aria-labelledby': 'changePointConfig',
        focusedPanelId,
      },
      loadContent: async ({ closeFlyout }) => {
        const currentConfiguration = embeddable.configuration$.getValue();
        if (!currentConfiguration) {
          return null;
        }
        const currentEsql = embeddable.esql$.getValue()[0]?.esql ?? '';
        const previewTimeRange = apiPublishesTimeRange(embeddable)
          ? embeddable.timeRange$.getValue()
          : undefined;

        const [
          { EmbeddableChangePointEsqlUserInput },
          {
            getChangePointConfigurationTitle,
            getChangePointSubmissionTitle,
            toChangePointGridConfiguration,
          },
          resolvedState,
        ] = await Promise.all([
          import('../embeddables/change_point_chart/change_point_esql_config_input'),
          import('../embeddables/change_point_chart/build_change_point_panel_state'),
          resolveEditModeState({
            configuration: currentConfiguration,
            currentEsql,
            dataViews: pluginStart.data.dataViews,
          }),
        ]);

        const showTableOption = Boolean(coreStart.application.capabilities.discover_v2?.show);

        return (
          <EmbeddableChangePointEsqlUserInput
            coreStart={coreStart}
            pluginStart={pluginStart}
            dashboardParentApi={dashboardParentApi}
            showTableOption={showTableOption}
            isEditing={true}
            initialMode={resolvedState.initialMode}
            initialFormConfiguration={resolvedState.initialFormConfiguration}
            initialEsql={resolvedState.initialEsql}
            previewTimeRange={previewTimeRange}
            onConfirm={(submission) => {
              embeddable.updateChangePointQuery({
                esql: submission.esql,
                configuration: toChangePointGridConfiguration(submission),
              });
              const currentTitle = embeddable.title$.getValue();
              const hasCustomTitle =
                Boolean(currentTitle) &&
                currentTitle !== getChangePointConfigurationTitle(currentConfiguration);
              const nextTitle = getChangePointSubmissionTitle(submission);
              if (!hasCustomTitle && nextTitle !== currentTitle) {
                embeddable.setTitle(nextTitle);
              }
              closeFlyout();
            }}
            onCancel={closeFlyout}
          />
        );
      },
    });
  },
});
