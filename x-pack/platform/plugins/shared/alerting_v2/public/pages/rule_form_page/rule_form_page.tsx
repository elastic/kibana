/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { useParams, useLocation } from 'react-router-dom';
import { useQueryClient } from '@kbn/react-query';
import {
  StandaloneRuleForm,
  mapRuleResponseToFormValues,
  DEFAULT_THRESHOLD_DATA_SOURCE,
} from '@kbn/alerting-v2-rule-form';
import type { FormValues } from '@kbn/alerting-v2-rule-form';
import { i18n } from '@kbn/i18n';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { ruleKeys } from '../../hooks/query_key_factory';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { paths } from '../../constants';
import {
  RuleEvaluationEsqlHeaderActions,
  RULE_EVALUATION_DEFAULT_BUILDER_ID,
  RULE_EVALUATION_LAST_BUILDER_SESSION_KEY,
} from '../../components/rule_evaluation_esql_header_actions';
import { RULE_BUILDERS } from '../../rule_builders/rule_builder_definitions';

const DEFAULT_QUERY = 'FROM logs-*\n| LIMIT 1';

const CLONE_NAME_SUFFIX = i18n.translate('xpack.alertingV2.ruleFormPage.cloneNameSuffix', {
  defaultMessage: ' (clone)',
});

type EvaluationPanelState = {
  mode: 'esql' | 'builder';
  /** Active / last builder id for guided UI and for ES|QL summary when mode is esql */
  builderId: string | undefined;
};

const readInitialEvaluationPanel = (): EvaluationPanelState => {
  const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const builder = sp.get('builder');
  if (builder) {
    return { mode: 'builder', builderId: builder };
  }
  if (sp.get('mode') === 'esql') {
    const fromSession =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem(RULE_EVALUATION_LAST_BUILDER_SESSION_KEY) ?? undefined
        : undefined;
    return { mode: 'esql', builderId: fromSession };
  }
  return { mode: 'esql', builderId: undefined };
};

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
  const {
    data: rule,
    isLoading,
    isFetching,
    isFetchedAfterMount,
    isError,
    error,
  } = useFetchRule(ruleId);

  if (isLoading || (!isFetchedAfterMount && isFetching)) {
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
  const [evaluationPanel, setEvaluationPanel] = useState<EvaluationPanelState>(readInitialEvaluationPanel);

  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));
  const application = useService(CoreStart('application'));
  const { navigateToUrl } = application;
  const { basePath } = http;
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;
  const lens = useService(PluginStart('lens')) as LensPublicStart;
  const agentBuilder = useService(PluginStart('agentBuilder'), {
    optional: true,
  }) as AgentBuilderPluginStart | undefined;
  const queryClient = useQueryClient();

  const showAskAiAgentButton = Boolean(
    agentBuilder && application.capabilities.agentBuilder?.show === true
  );

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

  /** Create/clone: ES|QL vs builder is local state only (no history.replace) so the rest of the page stays stable. */
  const includeQueryEditor = isEditing || evaluationPanel.mode === 'esql';

  const ruleBuilderIdForForm = isEditing ? undefined : evaluationPanel.builderId;

  const resolveBuilderIdForToggle = useCallback(() => {
    if (evaluationPanel.builderId) {
      return evaluationPanel.builderId;
    }
    if (typeof window !== 'undefined') {
      return (
        window.sessionStorage.getItem(RULE_EVALUATION_LAST_BUILDER_SESSION_KEY) ??
        RULE_EVALUATION_DEFAULT_BUILDER_ID
      );
    }
    return RULE_EVALUATION_DEFAULT_BUILDER_ID;
  }, [evaluationPanel.builderId]);

  const selectEsqlMode = useCallback(() => {
    setEvaluationPanel((prev) => {
      if (prev.mode === 'builder' && prev.builderId && typeof window !== 'undefined') {
        window.sessionStorage.setItem(RULE_EVALUATION_LAST_BUILDER_SESSION_KEY, prev.builderId);
      }
      const nextBuilderId =
        prev.builderId ??
        (typeof window !== 'undefined'
          ? window.sessionStorage.getItem(RULE_EVALUATION_LAST_BUILDER_SESSION_KEY) ?? undefined
          : undefined);
      return { mode: 'esql', builderId: nextBuilderId };
    });
  }, []);

  const selectBuilderMode = useCallback(() => {
    const id = resolveBuilderIdForToggle();
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(RULE_EVALUATION_LAST_BUILDER_SESSION_KEY, id);
    }
    setEvaluationPanel({ mode: 'builder', builderId: id });
  }, [resolveBuilderIdForToggle]);

  const onPickBuilder = useCallback((id: string) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(RULE_EVALUATION_LAST_BUILDER_SESSION_KEY, id);
    }
    setEvaluationPanel({ mode: 'builder', builderId: id });
  }, []);

  const builderIconType = useMemo(() => {
    const id =
      evaluationPanel.builderId ??
      (typeof window !== 'undefined'
        ? window.sessionStorage.getItem(RULE_EVALUATION_LAST_BUILDER_SESSION_KEY) ??
          RULE_EVALUATION_DEFAULT_BUILDER_ID
        : RULE_EVALUATION_DEFAULT_BUILDER_ID);
    return RULE_BUILDERS.find((b) => b.id === id)?.iconType ?? 'aggregate';
  }, [evaluationPanel.builderId]);

  const ruleEvaluationHeaderActions = useMemo(() => {
    if (isEditing) {
      return undefined;
    }
    return (
      <RuleEvaluationEsqlHeaderActions
        selectedMode={evaluationPanel.mode === 'esql' ? 'esql' : 'builder'}
        onChange={(next) => {
          if (next === 'esql') {
            selectEsqlMode();
          } else {
            selectBuilderMode();
          }
        }}
        onPickBuilder={onPickBuilder}
        builderIconType={builderIconType}
        basePath={basePath}
        showAgentBuilderButton={showAskAiAgentButton}
        onOpenAgentBuilder={agentBuilder ? () => agentBuilder.toggleChat() : undefined}
      />
    );
  }, [
    isEditing,
    evaluationPanel.mode,
    selectEsqlMode,
    selectBuilderMode,
    onPickBuilder,
    builderIconType,
    basePath,
    showAskAiAgentButton,
    agentBuilder,
  ]);

  const needsThresholdDefaults =
    !ruleId &&
    evaluationPanel.mode === 'builder' &&
    evaluationPanel.builderId === 'threshold_alert';

  const mergedInitialValues = useMemo(() => {
    if (!needsThresholdDefaults) {
      return initialValues;
    }
    return {
      ...initialValues,
      thresholdDataSource: initialValues?.thresholdDataSource ?? DEFAULT_THRESHOLD_DATA_SOURCE,
      thresholdStats: initialValues?.thresholdStats ?? [
        { label: '', aggregation: 'avg' as const, field: '' },
      ],
      thresholdConditionCombinator: initialValues?.thresholdConditionCombinator ?? 'and',
      thresholdConditions: initialValues?.thresholdConditions ?? [
        { statLabel: '', operator: 'gt' as const, value: '' },
      ],
    };
  }, [needsThresholdDefaults, initialValues]);

  const ruleEvaluationModeLabel = useMemo(() => {
    if (evaluationPanel.mode === 'esql') {
      return i18n.translate('xpack.alertingV2.ruleFormPage.evaluationModeEsql', {
        defaultMessage: 'ES|QL',
      });
    }
    if (evaluationPanel.builderId) {
      const def = RULE_BUILDERS.find((b) => b.id === evaluationPanel.builderId);
      return def?.title ?? evaluationPanel.builderId;
    }
    return undefined;
  }, [evaluationPanel.mode, evaluationPanel.builderId]);

  const standaloneFormKey = ruleId ? `rule-form-edit-${ruleId}` : 'rule-form-create';

  return (
    <>
      <EuiPageHeader pageTitle={pageTitle} />
      <EuiSpacer size="m" />
      <StandaloneRuleForm
        key={standaloneFormKey}
        query={initialQuery ?? DEFAULT_QUERY}
        services={ruleFormServices}
        includeSubmission
        onSuccess={onSuccess}
        onCancel={onCancel}
        ruleId={ruleId}
        initialValues={mergedInitialValues}
        submitLabel={submitLabel}
        ruleEvaluationHeaderActions={ruleEvaluationHeaderActions}
        includeQueryEditor={includeQueryEditor}
        ruleBuilderId={ruleBuilderIdForForm}
        ruleEvaluationModeLabel={ruleEvaluationModeLabel}
      />
    </>
  );
};
