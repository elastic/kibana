/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiCallOut,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiPageTemplate,
  EuiSpacer,
} from '@elastic/eui';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { useParams, useLocation } from 'react-router-dom';
import { useQueryClient } from '@kbn/react-query';
import { StandaloneRuleForm, mapRuleResponseToFormValues } from '@kbn/alerting-v2-rule-form';
import type { FormValues } from '@kbn/alerting-v2-rule-form';
import { i18n } from '@kbn/i18n';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { ruleKeys } from '../../hooks/query_key_factory';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { paths } from '../../constants';

const DEFAULT_QUERY = 'FROM logs-*\n| LIMIT 1';

const CLONE_NAME_SUFFIX = i18n.translate('xpack.alertingV2.ruleFormPage.cloneNameSuffix', {
  defaultMessage: ' (clone)',
});

export const RuleFormPage = () => {
  const { id: ruleId } = useParams<{ id?: string }>();
  const { search } = useLocation();
  const cloneFromId = new URLSearchParams(search).get('cloneFrom');

  let content: React.ReactNode;
  if (ruleId) {
    content = <FetchedRuleFormPage ruleId={ruleId} mode="edit" />;
  } else if (cloneFromId) {
    content = <FetchedRuleFormPage ruleId={cloneFromId} mode="clone" />;
  } else {
    content = <RuleFormPageContent />;
  }

  return (
    <EuiPageTemplate.Section paddingSize="none" restrictWidth={true}>
      {content}
    </EuiPageTemplate.Section>
  );
};

interface FetchedRuleFormPageProps {
  ruleId: string;
  mode: 'edit' | 'clone';
}

const FetchedRuleFormPage = ({ ruleId, mode }: FetchedRuleFormPageProps) => {
  const isClone = mode === 'clone';
  const { data: rule, isLoading, isError, error } = useFetchRule(ruleId);

  if (isLoading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (isError || (!rule && !isLoading)) {
    return (
      <EuiCallOut
        title={
          isClone ? (
            <FormattedMessage
              id="xpack.alertingV2.ruleFormPage.cloneLoadErrorTitle"
              defaultMessage="Failed to load source rule for cloning"
            />
          ) : (
            <FormattedMessage
              id="xpack.alertingV2.ruleFormPage.loadErrorTitle"
              defaultMessage="Failed to load rule"
            />
          )
        }
        color="danger"
        iconType="error"
        announceOnMount
      >
        {error instanceof Error ? error.message : String(error)}
      </EuiCallOut>
    );
  }

  const initialQuery = rule.evaluation?.query?.base ?? DEFAULT_QUERY;
  const initialValues = mapRuleResponseToFormValues(rule);

  if (isClone && initialValues.metadata) {
    initialValues.metadata = {
      ...initialValues.metadata,
      name: `${initialValues.metadata.name}${CLONE_NAME_SUFFIX}`,
    };
  }

  return (
    <RuleFormPageContent
      ruleId={isClone ? undefined : ruleId}
      initialQuery={initialQuery}
      initialValues={initialValues}
    />
  );
};

interface RuleFormPageContentProps {
  ruleId?: string;
  initialQuery?: string;
  initialValues?: Partial<FormValues>;
}

const RuleFormPageContent = ({ ruleId, initialQuery, initialValues }: RuleFormPageContentProps) => {
  const isEditing = Boolean(ruleId);
  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));
  const application = useService(CoreStart('application'));
  const { navigateToUrl } = application;
  const { basePath } = http;
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;
  const lens = useService(PluginStart('lens')) as LensPublicStart;
  const queryClient = useQueryClient();

  useBreadcrumbs(isEditing ? 'edit' : 'create');

  const ruleFormServices = useMemo(
    () => ({
      http,
      data,
      dataViews,
      notifications,
      application,
      lens,
    }),
    [http, data, dataViews, notifications, application, lens]
  );

  const onSuccess = useCallback(() => {
    queryClient.invalidateQueries(ruleKeys.lists());
    if (ruleId) {
      queryClient.invalidateQueries(ruleKeys.detail(ruleId));
    }
    navigateToUrl(basePath.prepend(paths.ruleList));
  }, [queryClient, ruleId, navigateToUrl, basePath]);

  const onCancel = () => {
    navigateToUrl(basePath.prepend(paths.ruleList));
  };

  const pageTitle = isEditing ? (
    <FormattedMessage id="xpack.alertingV2.createRule.editPageTitle" defaultMessage="Edit rule" />
  ) : (
    <FormattedMessage id="xpack.alertingV2.createRule.pageTitle" defaultMessage="Create rule" />
  );

  const submitLabel = isEditing ? (
    <FormattedMessage id="xpack.alertingV2.createRule.saveLabel" defaultMessage="Save changes" />
  ) : (
    <FormattedMessage id="xpack.alertingV2.createRule.submitLabel" defaultMessage="Create rule" />
  );

  return (
    <>
      <EuiPageHeader pageTitle={pageTitle} />
      <EuiSpacer size="m" />
      <StandaloneRuleForm
        query={initialQuery ?? DEFAULT_QUERY}
        services={ruleFormServices}
        includeYaml
        isDisabled={false}
        includeSubmission
        onSuccess={onSuccess}
        onCancel={onCancel}
        ruleId={ruleId}
        initialValues={initialValues}
        submitLabel={submitLabel}
      />
    </>
  );
};
