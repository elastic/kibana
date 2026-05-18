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
import {
  StandaloneRuleForm,
  mapRuleResponseToFormValues,
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
} from '@kbn/alerting-v2-rule-form';
import type { FormValues, StateTransition } from '@kbn/alerting-v2-rule-form';
import { i18n } from '@kbn/i18n';
import type { ThresholdRuleFormValues } from '@kbn/alerting-v2-rule-form';
import { RULE_BUILDER_TYPE } from '@kbn/alerting-v2-rule-form';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { useFetchRuleBuilderConfig } from '../../hooks/use_fetch_rule_builder_config';
import { ruleKeys } from '../../hooks/query_key_factory';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { paths } from '../../constants';
import { ThresholdRuleFormContent } from '../rule_builders/threshold_alert/threshold_alert_form_content';

const DEFAULT_QUERY = 'FROM logs-*\n| LIMIT 1';

const CLONE_NAME_SUFFIX = i18n.translate('xpack.alertingV2.ruleFormPage.cloneNameSuffix', {
  defaultMessage: ' (clone)',
});

const parseRuleBuilderConfig = (
  ruleBuilderConfig?: { type: string; config: string } | null
): Partial<ThresholdRuleFormValues> | undefined => {
  if (!ruleBuilderConfig || ruleBuilderConfig.type !== RULE_BUILDER_TYPE) {
    return undefined;
  }
  try {
    return JSON.parse(ruleBuilderConfig.config) as Partial<ThresholdRuleFormValues>;
  } catch {
    return undefined;
  }
};

export const RuleFormPage = () => {
  const { id: ruleId } = useParams<{ id?: string }>();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const mode = params.get('mode');
  const cloneFromId = params.get('cloneFrom');

  let content: React.ReactNode;
  if (ruleId) {
    content = <FetchedRuleFormPage ruleId={ruleId} mode="edit" />;
  } else if (cloneFromId) {
    content = <FetchedRuleFormPage ruleId={cloneFromId} mode="clone" />;
  } else if (mode === 'threshold_alert') {
    content = <ThresholdRuleFormPageContent />;
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
  const {
    data: rule,
    isLoading,
    isFetching,
    isFetchedAfterMount,
    isError,
    error,
  } = useFetchRule(ruleId);

  const isBuilderRule = rule?.edit_mode === 'rule_builder';
  const { data: ruleBuilderConfig, isLoading: isRuleBuilderConfigLoading } =
    useFetchRuleBuilderConfig(ruleId, isBuilderRule);

  if (
    isLoading ||
    (!isFetchedAfterMount && isFetching) ||
    (isBuilderRule && isRuleBuilderConfigLoading)
  ) {
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

  const builderInitialValues = isBuilderRule
    ? parseRuleBuilderConfig(ruleBuilderConfig)
    : undefined;

  if (isBuilderRule) {
    const stateTransition: StateTransition = {
      pendingCount: rule.state_transition?.pending_count ?? null,
      pendingTimeframe: rule.state_transition?.pending_timeframe ?? null,
      recoveringCount: rule.state_transition?.recovering_count ?? null,
      recoveringTimeframe: rule.state_transition?.recovering_timeframe ?? null,
    };

    const ruleName = isClone ? `${rule.metadata.name}${CLONE_NAME_SUFFIX}` : rule.metadata.name;

    return (
      <ThresholdRuleFormPageContent
        ruleId={isClone ? undefined : ruleId}
        initialValues={{
          ...(builderInitialValues ?? {}),
          kind: rule.kind,
          metadata: {
            name: ruleName,
            description: rule.metadata.description,
            tags: rule.metadata.tags,
          },
          schedule: {
            every: rule.schedule.every,
            lookback: rule.schedule.lookback ?? '5m',
          },
          ...(rule.recovery_policy
            ? {
                recoveryPolicy: {
                  type: rule.recovery_policy.type,
                  ...(rule.recovery_policy.query
                    ? { query: { base: rule.recovery_policy.query.base } }
                    : {}),
                },
              }
            : {}),
          stateTransition,
          stateTransitionAlertDelayMode: deriveAlertDelayModeFromStateTransition(stateTransition),
          stateTransitionRecoveryDelayMode:
            deriveRecoveryDelayModeFromStateTransition(stateTransition),
          ...(rule.artifacts ? { artifacts: rule.artifacts } : {}),
        }}
      />
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

interface ThresholdRuleFormPageContentProps {
  ruleId?: string;
  initialValues?: Partial<ThresholdRuleFormValues>;
}

const ThresholdRuleFormPageContent = ({
  ruleId,
  initialValues,
}: ThresholdRuleFormPageContentProps) => {
  const isEditing = Boolean(ruleId);
  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));
  const application = useService(CoreStart('application'));
  const thresholdData = useService(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;
  const lens = useService(PluginStart('lens')) as LensPublicStart;

  useBreadcrumbs(isEditing ? 'edit' : 'create');

  const pageTitle = isEditing ? (
    <FormattedMessage id="xpack.alertingV2.createRule.editPageTitle" defaultMessage="Edit rule" />
  ) : (
    <FormattedMessage
      id="xpack.alertingV2.createRule.thresholdPageTitle"
      defaultMessage="Create threshold rule"
    />
  );

  return (
    <>
      <EuiPageHeader pageTitle={pageTitle} />
      <EuiSpacer size="m" />
      <ThresholdRuleFormContent
        http={http}
        notifications={notifications}
        application={application}
        data={thresholdData}
        dataViews={dataViews}
        lens={lens}
        initialValues={initialValues}
        ruleId={ruleId}
      />
    </>
  );
};

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
