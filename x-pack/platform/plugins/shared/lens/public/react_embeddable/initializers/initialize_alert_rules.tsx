/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { escapeRegExp } from 'lodash';
import type { ActionTypeRegistryContract } from '@kbn/alerts-ui-shared';
import { ESQLControlVariable, apiPublishesESQLVariables } from '@kbn/esql-types';
import { parse, Walker } from '@kbn/esql-ast';
import type { AggregateQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { tracksOverlays } from '@kbn/presentation-containers';
import type { RuleTypeRegistryContract } from '@kbn/response-ops-rule-form';
import { isValidRuleFormPlugins } from '@kbn/response-ops-rule-form/lib';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import React from 'react';
import type {
  LensAlertRulesApi,
  LensCreateAlertRuleInitialValues,
  LensEmbeddableStartServices,
} from '../types';
import { mountInlinePanel } from '../inline_editing/mount';

export function initializeAlertRules(
  uuid: string,
  parentApi: unknown,
  startDependencies: LensEmbeddableStartServices
): { api: LensAlertRulesApi } {
  return {
    api: {
      createAlertRule: async (
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

        const esqlVariables$ = apiPublishesESQLVariables(parentApi)
          ? parentApi.esqlVariables$
          : undefined;
        let initialValues = { ...passedInitialValues };

        const esqlVariables = esqlVariables$?.getValue() ?? [];
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
        };

        const { RuleFormFlyout } = await import('@kbn/response-ops-rule-form/flyout');

        mountInlinePanel(
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
          coreStart,
          overlayTracker,
          { dataTestSubj: 'lensAlertRule', uuid }
        );
      },
    },
  };
}

function parseEsqlVariables(query: AggregateQuery | undefined, variables: ESQLControlVariable[]) {
  if (!query) return query;
  let parsedQuery = query.esql;

  const variableLookup: Record<string, string | number> = variables.reduce(
    (result, { key, value }) => ({
      ...result,
      [key]: value,
    }),
    {}
  );

  const { root } = parse(query.esql);
  const params = Walker.params(root);

  params.forEach(({ value: variableName, text }) => {
    if (variableName in variableLookup) {
      const value = variableLookup[variableName];
      // Do NOT use a global regexp, `params` lists all variables in the query in the order they occur, including duplicates
      // We want to make sure we replace params one by one, in order, in case any param is a substring of a longer param
      // e.g. ??field and ??field1
      parsedQuery = parsedQuery.replace(new RegExp(escapeRegExp(text)), String(value));
    }
  });

  return { esql: parsedQuery };
}
