/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeRegistryContract } from '@kbn/alerts-ui-shared';
import { ESQLControlVariable, apiPublishesESQLVariables } from '@kbn/esql-types';
import { unitsMap } from '@kbn/datemath';
import { AggregateQuery, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { tracksOverlays } from '@kbn/presentation-containers';
import { apiPublishesUnifiedSearch } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { RuleTypeRegistryContract } from '@kbn/response-ops-rule-form';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { isValidRuleFormPlugins } from '@kbn/response-ops-rule-form/lib';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import { getDateRange } from '@kbn/timerange';
import React from 'react';
import type {
  LensAlertRulesApi,
  LensCreateAlertRuleInitialValues,
  LensEmbeddableStartServices,
} from '../types';
import { buildObservableVariable } from '../helper';

export function initializeAlertRules(
  uuid: string,
  parentApi: unknown,
  startDependencies: LensEmbeddableStartServices
): { api: LensAlertRulesApi } {
  return {
    api: {
      createAlertRule: (
        passedInitialValues: LensCreateAlertRuleInitialValues,
        ruleTypeRegistry: RuleTypeRegistryContract,
        actionTypeRegistry: ActionTypeRegistryContract
      ) => {
        const { coreStart } = startDependencies;
        const ruleFormPlugins = {
          ...startDependencies,
          ...coreStart,
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

        const { timeRange$ } = apiPublishesUnifiedSearch(parentApi)
          ? parentApi
          : { timeRange$: undefined };
        const timeRange = timeRange$?.getValue();

        const [esqlVariables$] = buildObservableVariable(
          apiPublishesESQLVariables(parentApi) ? parentApi.esqlVariables$ : []
        );

        let initialValues = { ...passedInitialValues };

        if (timeRange) {
          initialValues = {
            params: {
              ...initialValues.params,
              ...timeRangeToNearestTimeWindow(timeRange),
            },
          };
        }

        const esqlVariables = esqlVariables$.getValue();
        if (esqlVariables.length) {
          initialValues = {
            params: {
              ...initialValues.params,
              esqlQuery: parseEsqlVariables(initialValues.params?.esqlQuery, esqlVariables),
            },
          };
        }

        const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

        const closeRuleForm = () => {
          overlayTracker?.clearOverlays();
          handle?.close();
        };

        const handle = coreStart.overlays.openFlyout(
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

function parseEsqlVariables(query: AggregateQuery | undefined, variables: ESQLControlVariable[]) {
  if (!query) return query;
  let parsedQuery = query.esql;

  variables.forEach(({ key, value }) => {
    parsedQuery = parsedQuery.replace(`??${key}`, String(value));
  });

  return { esql: parsedQuery };
}
