/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiCallOut, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { getESQLSources, getEsqlColumns } from '@kbn/esql-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHistory, useParams } from 'react-router-dom';
import { StandaloneRuleForm } from '@kbn/alerting-v2-rule-form';
import { RulesApi } from '../services/rules_api';

const DEFAULT_QUERY = 'FROM logs-*\n| LIMIT 1';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const CreateRulePage = () => {
  const { id: ruleId } = useParams<{ id?: string }>();
  const isEditing = Boolean(ruleId);
  const history = useHistory();
  const rulesApi = useService(RulesApi);
  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));
  const application = useService(CoreStart('application'));
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;

  const [initialQuery, setInitialQuery] = useState(DEFAULT_QUERY);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingRule, setIsLoadingRule] = useState(false);

  const esqlCallbacks = useMemo<ESQLCallbacks>(
    () => ({
      getSources: async () => getESQLSources({ application, http }, undefined),
      getColumnsFor: async ({ query }: { query?: string } | undefined = {}) =>
        getEsqlColumns({ esqlQuery: query, search: data.search.search }),
    }),
    [application, http, data.search.search]
  );

  const ruleFormServices = useMemo(
    () => ({
      http,
      data,
      dataViews,
      notifications,
    }),
    [http, data, dataViews, notifications]
  );

  // Load existing rule for editing
  useEffect(() => {
    if (!ruleId) {
      return;
    }

    let cancelled = false;
    const loadRule = async () => {
      setIsLoadingRule(true);
      setLoadError(null);

      try {
        const rule = await rulesApi.getRule(ruleId);
        if (cancelled) {
          return;
        }

        // Set the initial query from the loaded rule
        setInitialQuery(rule.evaluation?.query?.base ?? DEFAULT_QUERY);
      } catch (err) {
        if (!cancelled) {
          setLoadError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRule(false);
        }
      }
    };

    loadRule();

    return () => {
      cancelled = true;
    };
  }, [ruleId, rulesApi]);

  const onSuccess = () => {
    history.push('/');
  };

  const onCancel = () => {
    history.push('/');
  };

  return (
    <>
      <EuiPageHeader
        pageTitle={
          isEditing ? (
            <FormattedMessage
              id="xpack.alertingV2.createRule.editPageTitle"
              defaultMessage="Edit rule"
            />
          ) : (
            <FormattedMessage
              id="xpack.alertingV2.createRule.pageTitle"
              defaultMessage="Create rule"
            />
          )
        }
      />
      <EuiSpacer size="m" />

      {loadError && (
        <>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.alertingV2.createRule.loadErrorTitle"
                defaultMessage="Failed to load rule"
              />
            }
            color="danger"
            iconType="error"
            announceOnMount
          >
            {loadError}
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}

      <StandaloneRuleForm
        query={initialQuery}
        services={ruleFormServices}
        includeYaml
        esqlCallbacks={esqlCallbacks}
        isDisabled={isLoadingRule}
        includeSubmission
        onSuccess={onSuccess}
        onCancel={onCancel}
        submitLabel={
          isEditing ? (
            <FormattedMessage
              id="xpack.alertingV2.createRule.saveLabel"
              defaultMessage="Save changes"
            />
          ) : (
            <FormattedMessage
              id="xpack.alertingV2.createRule.submitLabel"
              defaultMessage="Create rule"
            />
          )
        }
      />
    </>
  );
};
