/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeRegistryContract } from '@kbn/alerts-ui-shared';
import { OverlayRef } from '@kbn/core/public';
import { unitsMap } from '@kbn/datemath';
import { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { tracksOverlays } from '@kbn/presentation-containers';
import { apiPublishesUnifiedSearch } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { RuleFormData, RuleTypeRegistryContract } from '@kbn/response-ops-rule-form';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { isValidRuleFormPlugins } from '@kbn/response-ops-rule-form/lib';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import { getDateRange } from '@kbn/timerange';
import React from 'react';
import type { LensAlertRulesApi, LensEmbeddableStartServices } from '../types';

export function initializeAlertRules(
  uuid: string,
  parentApi: unknown,
  startDependencies: LensEmbeddableStartServices
): { api: LensAlertRulesApi } {
  return {
    api: {
      createAlertRule: (
        passedInitialValues: Partial<RuleFormData>,
        ruleTypeRegistry: RuleTypeRegistryContract,
        actionTypeRegistry: ActionTypeRegistryContract
      ) => {
        const { timeRange$ } = apiPublishesUnifiedSearch(parentApi)
          ? parentApi
          : { timeRange$: undefined };
        const timeRange = timeRange$?.getValue();

        let initialValues = {
          params: {
            ...passedInitialValues.params,
            linkedVisId: uuid,
          },
        };

        if (timeRange) {
          initialValues = {
            params: {
              ...initialValues.params,
              ...timeRangeToNearestTimeWindow(timeRange),
            },
          };
        }

        const { coreStart } = startDependencies;
        const ruleFormPlugins = {
          ...startDependencies,
          ...startDependencies.coreStart,
          http: startDependencies.coreHttp,
        };
        const canShowRuleForm =
          isValidRuleFormPlugins(ruleFormPlugins) && ruleTypeRegistry && actionTypeRegistry;

        if (!canShowRuleForm) {
          throw new Error(
            i18n.translate('xpack.lens.createAlertRuleError', {
              defaultMessage: 'Unable to open the alert rule form, some services are missing',
            })
          );
        }

        const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

        // eslint doesn't notice `handle` getting reassinged for some reason,
        // and initializing it as `undefined` throws a different eslint error
        // eslint-disable-next-line prefer-const
        let handle: OverlayRef;
        const closeRuleForm = () => {
          overlayTracker?.clearOverlays();
          handle?.close();
        };

        handle = coreStart.overlays.openFlyout(
          toMountPoint(
            <KibanaContextProvider services={ruleFormPlugins}>
              <RuleFormFlyout
                data-test-subj="lensEmbeddableRuleForm"
                plugins={{ ...ruleFormPlugins, ruleTypeRegistry, actionTypeRegistry }}
                ruleTypeId={ES_QUERY_ID}
                initialValues={{
                  ...initialValues,
                  name: i18n.translate('xpack.lens.embeddable.alertRuleTitle.defaultName', {
                    defaultMessage: 'Elasticsearch query rule from visualization',
                  }),
                }}
                initialMetadata={{
                  isManagementPage: false,
                }}
                onCancel={closeRuleForm}
                onSubmit={closeRuleForm}
              />
            </KibanaContextProvider>,
            coreStart
          ),
          {
            className: 'lnsConfigPanel__overlay',
            size: 's',
            'data-test-subj': 'lensAlertRule',
            type: 'push',
            paddingSize: 'm',
            maxWidth: 800,
            hideCloseButton: true,
            isResizable: true,
            onClose: closeRuleForm,
            outsideClickCloses: true,
          }
        );
        overlayTracker?.openOverlay(handle, { focusedPanelId: uuid });
      },
    },
  };
}

function timeRangeToNearestTimeWindow(timeRange: TimeRange) {
  const { startDate, endDate } = getDateRange(timeRange);
  const timeWindow = endDate - startDate;
  const timeWindowUnit =
    timeWindow >= unitsMap.d.base
      ? 'd'
      : timeWindow >= unitsMap.h.base
      ? 'h'
      : timeWindow >= unitsMap.m.base
      ? 'm'
      : 's';
  const timeWindowSize = Math.round(timeWindow / unitsMap[timeWindowUnit].base);

  return { timeWindowUnit, timeWindowSize };
}
