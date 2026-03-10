/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiLoadingSpinner, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { useParams } from 'react-router-dom';
import { StandaloneRuleForm } from '@kbn/alerting-v2-rule-form';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { paths } from '../../constants';

const DEFAULT_QUERY = 'FROM logs-*\n| LIMIT 1';

export const RuleFormPage = () => {
  const { id: ruleId } = useParams<{ id?: string }>();
  const isEditing = Boolean(ruleId);

  if (isEditing && ruleId) {
    return <EditRuleFormPageContent ruleId={ruleId} />;
  }

  return <RuleFormPageContent />;
};

const EditRuleFormPageContent = ({ ruleId }: { ruleId: string }) => {
  const { data: rule, isLoading, isError, error } = useFetchRule(ruleId);

  if (isLoading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (isError) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.alertingV2.ruleFormPage.loadErrorTitle"
            defaultMessage="Failed to load rule"
          />
        }
        color="danger"
        iconType="error"
        announceOnMount
      >
        {error instanceof Error ? error.message : String(error)}
      </EuiCallOut>
    );
  }

  if (!rule) {
    return null;
  }

  const initialQuery = rule.evaluation?.query?.base ?? DEFAULT_QUERY;

  return <RuleFormPageContent ruleId={ruleId} initialQuery={initialQuery} />;
};

interface RuleFormPageContentProps {
  ruleId?: string;
  initialQuery?: string;
}

const RuleFormPageContent = ({ ruleId, initialQuery }: RuleFormPageContentProps) => {
  const isEditing = Boolean(ruleId);
  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));
  const application = useService(CoreStart('application'));
  const { navigateToUrl } = application;
  const { basePath } = http;
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;

  const ruleFormServices = useMemo(
    () => ({
      http,
      data,
      dataViews,
      notifications,
      application,
    }),
    [http, data, dataViews, notifications, application]
  );

  const onSuccess = () => {
    navigateToUrl(basePath.prepend(paths.ruleList));
  };

  const onCancel = () => {
    navigateToUrl(basePath.prepend(paths.ruleList));
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
      <StandaloneRuleForm
        query={initialQuery ?? DEFAULT_QUERY}
        services={ruleFormServices}
        includeYaml
        isDisabled={false}
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
