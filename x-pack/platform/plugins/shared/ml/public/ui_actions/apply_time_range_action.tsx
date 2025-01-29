/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_APP_ID } from '@kbn/dashboard-plugin/public';
import { i18n } from '@kbn/i18n';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import moment from 'moment';
import { firstValueFrom } from 'rxjs';
import { isAnomalySwimlaneSelectionTriggerContext } from './triggers';
import type { AppStateSelectedCells } from '../application/explorer/explorer_utils';
import type { AnomalySwimLaneEmbeddableApi } from '../embeddables/anomaly_swimlane/types';
import type { MlCoreSetup } from '../plugin';

export const APPLY_TIME_RANGE_SELECTION_ACTION = 'applyTimeRangeSelectionAction';

const supportedApps = [DASHBOARD_APP_ID];

export interface ApplyTimeRangeSelectionActionContext extends EmbeddableApiContext {
  embeddable: AnomalySwimLaneEmbeddableApi;
  /**
   * Optional data provided by swim lane selection
   */
  data?: AppStateSelectedCells;
}

export function createApplyTimeRangeSelectionAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<ApplyTimeRangeSelectionActionContext> {
  return {
    id: 'apply-time-range-selection',
    type: APPLY_TIME_RANGE_SELECTION_ACTION,
    getIconType(context): string {
      return 'timeline';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.applyTimeRangeSelectionTitle', {
        defaultMessage: 'Apply time range selection',
      }),
    async execute({ embeddable, data }) {
      if (!data) {
        throw new Error('No swim lane selection data provided');
      }
      const [, pluginStart] = await getStartServices();
      const timefilter = pluginStart.data.query.timefilter.timefilter;
      const { interval } = embeddable;

      if (!interval.getValue()) {
        throw new Error('Interval is required to set a time range');
      }

      let [from, to] = data.times;
      from = from * 1000;
      to = to * 1000;

      timefilter.setTime({
        from: moment(from),
        to: moment(to),
        mode: 'absolute',
      });
    },
    async isCompatible(context) {
      const [{ application }] = await getStartServices();
      const appId = await firstValueFrom(application.currentAppId$);
      return isAnomalySwimlaneSelectionTriggerContext(context) && supportedApps.includes(appId!);
    },
  };
}
