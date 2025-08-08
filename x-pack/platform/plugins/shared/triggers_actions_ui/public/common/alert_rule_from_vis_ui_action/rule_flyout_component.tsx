/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActionTypeRegistryContract, RuleTypeRegistryContract } from '@kbn/alerts-ui-shared';
import { i18n } from '@kbn/i18n';
import { escapeRegExp } from 'lodash';
import type { RuleFormData } from '@kbn/response-ops-rule-form';
import type { EsQueryRuleParams } from '@kbn/response-ops-rule-params/es_query';
import { isValidRuleFormPlugins } from '@kbn/response-ops-rule-form/lib';
import { ESQLControlVariable, apiPublishesESQLVariables } from '@kbn/esql-types';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import React from 'react';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { AggregateQuery } from '@kbn/es-query';
import { parse, Walker } from '@kbn/esql-ast';
import { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { KibanaContextProvider } from '../lib/kibana';

export interface ServiceDependencies {
  coreStart: CoreStart;
  charts: ChartsPluginSetup;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  contentManagement?: ContentManagementPublicStart;
}

export async function getRuleFlyoutComponent(
  startDependencies: ServiceDependencies,
  ruleTypeRegistry: RuleTypeRegistryContract,
  actionTypeRegistry: ActionTypeRegistryContract,
  parentApi: unknown,
  closeFlyout: () => void,
  passedInitialValues?: RuleFormData<EsQueryRuleParams>
): Promise<JSX.Element> {
  const { coreStart } = startDependencies;
  const ruleFormPlugins = {
    ...startDependencies,
    ...coreStart,
  };
  const canShowRuleForm =
    isValidRuleFormPlugins(ruleFormPlugins) && ruleTypeRegistry && actionTypeRegistry;

  if (!canShowRuleForm) {
    throw new Error(
      i18n.translate('xpack.triggersActionsUI.alertRuleFromVis.createAlertRuleError', {
        defaultMessage: 'Unable to open the alert rule form, some services are missing',
      })
    );
  }

  const esqlVariables$ = apiPublishesESQLVariables(parentApi)
    ? parentApi.esqlVariables$
    : undefined;

  const esqlVariables = esqlVariables$?.getValue() ?? [];
  const initialValues = (
    esqlVariables.length
      ? {
          ...passedInitialValues,
          params: {
            ...passedInitialValues?.params,
            esqlQuery: parseEsqlVariables(passedInitialValues?.params?.esqlQuery, esqlVariables),
          },
        }
      : {
          ...passedInitialValues,
        }
  ) as RuleFormData<EsQueryRuleParams>;

  const { RuleForm } = await import('@kbn/response-ops-rule-form/flyout');

  return (
    <KibanaContextProvider services={ruleFormPlugins}>
      <RuleForm
        data-test-subj="lensEmbeddableRuleForm"
        plugins={{
          ...ruleFormPlugins,
          ruleTypeRegistry,
          actionTypeRegistry,
        }}
        ruleTypeId={ES_QUERY_ID}
        initialValues={initialValues}
        initialMetadata={{
          isManagementPage: false,
        }}
        onCancel={closeFlyout}
        onSubmit={closeFlyout}
        isFlyout
      />
    </KibanaContextProvider>
  );
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
