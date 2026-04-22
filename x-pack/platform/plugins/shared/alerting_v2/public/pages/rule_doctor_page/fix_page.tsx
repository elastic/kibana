/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import {
  EuiPageHeader,
  EuiEmptyPrompt,
  EuiButton,
  EuiSpacer,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLink,
  EuiLoadingSpinner,
  EuiDescriptionList,
  EuiTitle,
  EuiPanel,
} from '@elastic/eui';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { FormValues } from '@kbn/alerting-v2-rule-form';
import {
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
} from '@kbn/alerting-v2-rule-form';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { PROPOSED_CHANGE_ATTACHMENT_TYPE } from '../../agent_builder/proposed_change_attachment';
import type {
  ProposedChangeAttachmentData,
  RelatedRuleInfo,
} from '../../agent_builder/proposed_change_attachment';
import { RulesApi } from '../../services/rules_api';
import type { RuleApiResponse } from '../../services/rules_api';
import { RuleDoctorApi, type FindingDoc } from '../../services/rule_doctor_api';
import { paths } from '../../constants';
import type { RuleDoctorFinding } from './types';

type DescItem = { title: NonNullable<React.ReactNode>; description: NonNullable<React.ReactNode> };

interface FixPageLocationState {
  finding?: RuleDoctorFinding;
}

const toFinding = (doc: FindingDoc): RuleDoctorFinding => ({
  id: doc.finding_id,
  type: doc.type,
  action: doc.action,
  impact: doc.impact,
  confidence: doc.confidence,
  summary: doc.summary,
  explanation: doc.explanation,
  ruleIds: doc.rule_ids,
  details: doc.details ?? {},
  current: doc.current ?? null,
  proposed: doc.proposed ?? null,
  diffs: doc.diffs ?? [],
});

const mapProposedToFormValues = (proposed: Record<string, unknown>): Partial<FormValues> => {
  const metadata = proposed.metadata as Record<string, unknown> | undefined;
  const schedule = proposed.schedule as Record<string, unknown> | undefined;
  const evaluation = proposed.evaluation as Record<string, unknown> | undefined;
  const grouping = proposed.grouping as Record<string, unknown> | undefined;
  const raw = proposed.state_transition as Record<string, unknown> | undefined;
  const recoveryPolicy = proposed.recovery_policy as Record<string, unknown> | undefined;
  const query = (evaluation?.query as Record<string, unknown> | undefined)?.base as
    | string
    | undefined;

  const values: Partial<FormValues> = {};

  if (proposed.kind) values.kind = proposed.kind as FormValues['kind'];
  if (metadata) {
    values.metadata = {
      name: metadata.name as string,
      enabled: (proposed.enabled as boolean) ?? true,
      description: metadata.description as string | undefined,
      owner: metadata.owner as string | undefined,
      tags: metadata.tags as string[] | undefined,
    };
  }
  if (proposed.time_field) values.timeField = proposed.time_field as string;
  if (schedule) {
    values.schedule = {
      every: schedule.every as string,
      lookback: (schedule.lookback as string) ?? '1m',
    };
  }
  if (query) {
    values.evaluation = { query: { base: query } };
  }
  if (grouping) {
    values.grouping = { fields: (grouping.fields as string[]) ?? [] };
  }
  if (recoveryPolicy) {
    const rpQuery = recoveryPolicy.query as Record<string, unknown> | undefined;
    values.recoveryPolicy = {
      type: recoveryPolicy.type as FormValues['recoveryPolicy'] extends
        | { type: infer T }
        | undefined
        ? T
        : never,
      ...(rpQuery ? { query: { base: rpQuery.base as string | null | undefined } } : {}),
    };
  }
  if (raw) {
    const stateTransition = {
      pendingCount: (raw.pending_count as number) ?? null,
      pendingTimeframe: (raw.pending_timeframe as string) ?? null,
      recoveringCount: (raw.recovering_count as number) ?? null,
      recoveringTimeframe: (raw.recovering_timeframe as string) ?? null,
    };
    values.stateTransition = stateTransition;
    values.stateTransitionAlertDelayMode =
      deriveAlertDelayModeFromStateTransition(stateTransition);
    values.stateTransitionRecoveryDelayMode =
      deriveRecoveryDelayModeFromStateTransition(stateTransition);
  }

  return values;
};

const safeGet = (obj: Record<string, unknown>, path: string): unknown => {
  let current: unknown = obj;
  for (const key of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

const RuleDetailPanel: React.FC<{ rule: RuleApiResponse }> = ({ rule }) => {
  const items: DescItem[] = [
    { title: 'Kind', description: rule.kind },
    { title: 'Schedule', description: rule.schedule.every },
    { title: 'Enabled', description: rule.enabled ? 'Yes' : 'No' },
  ];

  if (rule.metadata.description) {
    items.push({ title: 'Description', description: rule.metadata.description });
  }

  if (rule.evaluation?.query?.base) {
    items.push({
      title: 'ES|QL query',
      description: (
        <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
          {rule.evaluation.query.base}
        </EuiCodeBlock>
      ),
    });
  }

  if (rule.metadata.tags && rule.metadata.tags.length > 0) {
    items.push({
      title: 'Tags',
      description: (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {rule.metadata.tags.map((tag) => (
            <EuiFlexItem key={tag} grow={false}>
              <EuiBadge color="hollow">{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
    });
  }

  if (rule.grouping?.fields && rule.grouping.fields.length > 0) {
    items.push({ title: 'Grouping fields', description: rule.grouping.fields.join(', ') });
  }

  if (rule.schedule.lookback) {
    items.push({ title: 'Lookback', description: rule.schedule.lookback });
  }

  return (
    <div>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>
              <EuiLink href={paths.ruleDetails(rule.id)}>{rule.metadata.name}</EuiLink>
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">Current</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiDescriptionList type="column" listItems={items} compressed />
    </div>
  );
};

const ProposedRulePanel: React.FC<{
  proposed: Record<string, unknown>;
  diffs: RuleDoctorFinding['diffs'];
  onUpdate: () => void;
  onEdit: () => void;
  onEditWithAgent?: () => void;
  updating: boolean;
}> = ({ proposed, diffs, onUpdate, onEdit, onEditWithAgent, updating }) => {
  const changedFields = useMemo(() => new Set(diffs.map((d) => d.field)), [diffs]);

  const diffLabel = (field: string): React.ReactNode =>
    changedFields.has(field) ? (
      <>
        {' '}
        <EuiBadge color="accent">Changed</EuiBadge>
      </>
    ) : null;

  const metadata = safeGet(proposed, 'metadata') as Record<string, unknown> | undefined;
  const schedule = safeGet(proposed, 'schedule') as Record<string, unknown> | undefined;
  const grouping = safeGet(proposed, 'grouping') as Record<string, unknown> | undefined;

  const name = (metadata?.name as string) ?? 'Proposed rule';
  const kind = (proposed.kind as string) ?? '';
  const every = (schedule?.every as string) ?? '';
  const enabled = proposed.enabled as boolean | undefined;
  const description = metadata?.description as string | undefined;
  const query = safeGet(proposed, 'evaluation.query.base') as string | undefined;
  const tags = (metadata?.tags as string[]) ?? [];
  const groupingFields = (grouping?.fields as string[]) ?? [];
  const lookback = schedule?.lookback as string | undefined;

  const items: DescItem[] = [
    {
      title: (<>Kind{diffLabel('kind')}</>),
      description: kind,
    },
    {
      title: (<>Schedule{diffLabel('schedule.every')}</>),
      description: every,
    },
    {
      title: (<>Enabled{diffLabel('enabled')}</>),
      description: enabled != null ? (enabled ? 'Yes' : 'No') : '—',
    },
  ];

  if (description) {
    items.push({
      title: (<>Description{diffLabel('metadata.description')}</>),
      description,
    });
  }

  if (query) {
    items.push({
      title: (<>ES|QL query{diffLabel('evaluation.query.base')}</>),
      description: (
        <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
          {query}
        </EuiCodeBlock>
      ),
    });
  }

  if (tags.length > 0) {
    items.push({
      title: (<>Tags{diffLabel('metadata.tags')}</>),
      description: (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {tags.map((tag) => (
            <EuiFlexItem key={tag} grow={false}>
              <EuiBadge color="hollow">{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
    });
  }

  if (groupingFields.length > 0) {
    items.push({
      title: (<>Grouping fields{diffLabel('grouping.fields')}</>),
      description: groupingFields.join(', '),
    });
  }

  if (lookback) {
    items.push({
      title: (<>Lookback{diffLabel('schedule.lookback')}</>),
      description: lookback,
    });
  }

  return (
    <div>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>{name}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="accent">Proposed</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiDescriptionList type="column" listItems={items} compressed />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton size="s" fill iconType="save" onClick={onUpdate} isLoading={updating}>
            Update
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" iconType="pencil" onClick={onEdit}>
            Edit
          </EuiButton>
        </EuiFlexItem>
        {onEditWithAgent && (
          <EuiFlexItem grow={false}>
            <EuiButton size="s" iconType="sparkles" onClick={onEditWithAgent}>
              Edit with agent
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};

const ExpandedRuleDetail: React.FC<{ rule: RuleApiResponse }> = ({ rule }) => {
  const items: DescItem[] = [];

  if (rule.metadata.description) {
    items.push({ title: 'Description', description: rule.metadata.description });
  }

  if (rule.evaluation?.query?.base) {
    items.push({
      title: 'ES|QL query',
      description: (
        <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
          {rule.evaluation.query.base}
        </EuiCodeBlock>
      ),
    });
  }

  if (rule.metadata.tags && rule.metadata.tags.length > 0) {
    items.push({
      title: 'Tags',
      description: (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {rule.metadata.tags.map((tag) => (
            <EuiFlexItem key={tag} grow={false}>
              <EuiBadge color="hollow">{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
    });
  }

  if (rule.grouping?.fields && rule.grouping.fields.length > 0) {
    items.push({ title: 'Grouping fields', description: rule.grouping.fields.join(', ') });
  }

  if (rule.schedule.lookback) {
    items.push({ title: 'Lookback', description: rule.schedule.lookback });
  }

  if (items.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        No additional details available.
      </EuiText>
    );
  }

  return <EuiDescriptionList type="column" listItems={items} compressed />;
};

export const FixPage: React.FC = () => {
  const { findingId } = useParams<{ findingId: string }>();
  const history = useHistory();
  const location = useLocation<FixPageLocationState>();
  const rulesApi = useService(RulesApi);

  const { toasts } = useService(CoreStart('notifications'));
  const application = useService(CoreStart('application'));
  const { navigateToUrl } = application;
  const { basePath } = useService(CoreStart('http'));
  const ruleDoctorApi = useService(RuleDoctorApi);
  const agentBuilder = useService<AgentBuilderPluginStart>(PluginStart('agentBuilder'), {
    optional: true,
  });
  const i18nStart = useService(CoreStart('i18n'));
  const theme = useService(CoreStart('theme'));
  const [finding, setFinding] = useState<RuleDoctorFinding | undefined>(location.state?.finding);
  const [findingError, setFindingError] = useState(false);
  const [rules, setRules] = useState<RuleApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, React.ReactNode>>({});
  const [retainRuleId, setRetainRuleId] = useState<string | undefined>(undefined);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (finding) return;

    let cancelled = false;
    ruleDoctorApi
      .getFinding(findingId)
      .then((doc) => {
        if (!cancelled) setFinding(toFinding(doc));
      })
      .catch(() => {
        if (!cancelled) setFindingError(true);
      })
      .finally(() => {
        if (!cancelled && !finding) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [findingId, finding, ruleDoctorApi]);

  useEffect(() => {
    if (!finding || finding.ruleIds.length === 0) {
      setLoading(false);
      return;
    }

    setRetainRuleId(finding.details?.retainRuleId as string | undefined);

    let cancelled = false;
    setLoading(true);
    rulesApi
      .getRulesByIds(finding.ruleIds)
      .then((response) => {
        if (!cancelled) setRules(response.items);
      })
      .catch(() => {
        // Fail silently; table will be empty
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rulesApi, finding]);

  const toggleRowExpansion = useCallback((rule: RuleApiResponse) => {
    setExpandedRows((prev) => {
      const next = { ...prev };
      if (next[rule.id]) {
        delete next[rule.id];
      } else {
        next[rule.id] = <ExpandedRuleDetail rule={rule} />;
      }
      return next;
    });
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!retainRuleId || !finding?.proposed) return;

    const markFindingApplied = async () => {
      try {
        await ruleDoctorApi.updateFindingStatus(finding.id, 'applied');
      } catch {
        // Best-effort; finding will still show but won't block the user
      }
    };

    setUpdating(true);
    try {
      const proposed = finding.proposed;
      const metadata = safeGet(proposed, 'metadata') as Record<string, unknown> | undefined;
      const schedule = safeGet(proposed, 'schedule') as Record<string, unknown> | undefined;
      const evaluation = safeGet(proposed, 'evaluation') as Record<string, unknown> | undefined;
      const grouping = safeGet(proposed, 'grouping') as Record<string, unknown> | undefined;

      const payload: Record<string, unknown> = {};
      if (metadata) payload.metadata = metadata;
      if (schedule) payload.schedule = schedule;
      if (evaluation) payload.evaluation = evaluation;
      if (grouping) payload.grouping = grouping;
      if (proposed.enabled != null) payload.enabled = proposed.enabled;
      if (proposed.state_transition !== undefined) payload.state_transition = proposed.state_transition;

      await rulesApi.updateRule(retainRuleId, payload as never);

      const deleteIds = finding.ruleIds.filter((id) => id !== retainRuleId);
      if (deleteIds.length > 0) {
        try {
          await rulesApi.bulkDeleteRules({ ids: deleteIds });
        } catch (deleteErr) {
          await markFindingApplied();
          const ruleUrl = basePath.prepend(paths.ruleDetails(retainRuleId));
          toasts.addWarning({
            title: 'Rule updated but failed to delete duplicates',
            text: toMountPoint(
              <p>
                {deleteErr instanceof Error ? deleteErr.message : String(deleteErr)}.{' '}
                <EuiLink href={ruleUrl}>View updated rule</EuiLink>
              </p>,
              { i18n: i18nStart, theme }
            ),
          });
          navigateToUrl(basePath.prepend(paths.ruleList));
          return;
        }
      }

      await markFindingApplied();

      const ruleUrl = basePath.prepend(paths.ruleDetails(retainRuleId));
      const deletedCount = deleteIds.length;
      toasts.addSuccess({
        title: `Rule updated and ${deletedCount} duplicate${deletedCount !== 1 ? 's' : ''} deleted`,
        text: toMountPoint(
          <p>
            <EuiLink href={ruleUrl}>View updated rule</EuiLink>
          </p>,
          { i18n: i18nStart, theme }
        ),
      });

      navigateToUrl(basePath.prepend(paths.ruleList));
    } catch (err) {
      toasts.addDanger(`Failed to update rule: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUpdating(false);
    }
  }, [retainRuleId, finding, rulesApi, toasts, navigateToUrl, basePath, i18nStart, theme, ruleDoctorApi]);

  const handleEdit = useCallback(() => {
    if (!retainRuleId || !finding?.proposed) return;
    const proposed = finding.proposed;
    const query = safeGet(proposed, 'evaluation.query.base') as string | undefined;
    history.push(`/edit/${encodeURIComponent(retainRuleId)}`, {
      initialValues: mapProposedToFormValues(proposed),
      ...(query ? { initialQuery: query } : {}),
    });
  }, [retainRuleId, finding, history]);

  const handleEditWithAgent = useCallback(() => {
    if (!finding?.proposed) return;
    const proposed = finding.proposed;
    const metadata = proposed.metadata as Record<string, unknown> | undefined;
    const ruleName = (metadata?.name as string) ?? 'Proposed rule';

    const relatedRules: RelatedRuleInfo[] = rules.map((rule) => ({
      id: rule.id,
      name: rule.metadata.name,
      kind: rule.kind,
      schedule: rule.schedule.every,
      enabled: rule.enabled,
      action: rule.id === retainRuleId ? 'retain' : 'delete',
    }));

    const attachment: AttachmentInput<string, ProposedChangeAttachmentData> = {
      id: `${PROPOSED_CHANGE_ATTACHMENT_TYPE}-${Date.now()}`,
      type: PROPOSED_CHANGE_ATTACHMENT_TYPE,
      data: {
        proposed: JSON.stringify(proposed),
        diffs: JSON.stringify(finding.diffs ?? []),
        ruleName,
        relatedRules: JSON.stringify(relatedRules),
      },
    };

    application.navigateToApp('agent_builder', {
      path: `/agents/${agentBuilderDefaultAgentId}`,
      state: {
        initialMessage: `I have a proposed change from Rule Doctor for the rule "${ruleName}". Please help me refine these changes.`,
        attachments: [attachment],
      },
    });
  }, [finding, application, rules, retainRuleId]);

  const retainedRule = useMemo(
    () => (retainRuleId ? rules.find((r) => r.id === retainRuleId) : undefined),
    [rules, retainRuleId]
  );

  const handleThresholdUpdate = useCallback(async () => {
    if (!finding?.proposed || rules.length === 0) return;
    const ruleId = finding.ruleIds[0];
    if (!ruleId) return;

    const markFindingApplied = async () => {
      try {
        await ruleDoctorApi.updateFindingStatus(finding.id, 'applied');
      } catch { /* best effort */ }
    };

    setUpdating(true);
    try {
      const proposed = finding.proposed;
      const metadata = safeGet(proposed, 'metadata') as Record<string, unknown> | undefined;
      const schedule = safeGet(proposed, 'schedule') as Record<string, unknown> | undefined;
      const evaluation = safeGet(proposed, 'evaluation') as Record<string, unknown> | undefined;

      const payload: Record<string, unknown> = {};
      if (metadata) payload.metadata = metadata;
      if (schedule) payload.schedule = schedule;
      if (evaluation) payload.evaluation = evaluation;
      if (proposed.state_transition !== undefined) payload.state_transition = proposed.state_transition;

      await rulesApi.updateRule(ruleId, payload as never);
      await markFindingApplied();

      const ruleUrl = basePath.prepend(paths.ruleDetails(ruleId));
      toasts.addSuccess({
        title: 'Rule thresholds updated',
        text: toMountPoint(
          <p><EuiLink href={ruleUrl}>View updated rule</EuiLink></p>,
          { i18n: i18nStart, theme }
        ),
      });
      navigateToUrl(basePath.prepend(paths.ruleList));
    } catch (err) {
      toasts.addDanger(`Failed to update rule: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUpdating(false);
    }
  }, [finding, rules, rulesApi, toasts, navigateToUrl, basePath, i18nStart, theme, ruleDoctorApi]);

  const handleStaleAction = useCallback(async () => {
    if (!finding || rules.length === 0) return;
    const ruleId = finding.ruleIds[0];
    if (!ruleId) return;

    const markFindingApplied = async () => {
      try {
        await ruleDoctorApi.updateFindingStatus(finding.id, 'applied');
      } catch { /* best effort */ }
    };

    setUpdating(true);
    try {
      if (finding.action === 'delete') {
        await rulesApi.bulkDeleteRules({ ids: [ruleId] });
        await markFindingApplied();
        toasts.addSuccess({ title: 'Stale rule deleted' });
      } else if (finding.action === 're_enable_and_tune' && finding.proposed) {
        const proposed = finding.proposed;
        const metadata = safeGet(proposed, 'metadata') as Record<string, unknown> | undefined;
        const schedule = safeGet(proposed, 'schedule') as Record<string, unknown> | undefined;
        const evaluation = safeGet(proposed, 'evaluation') as Record<string, unknown> | undefined;
        const payload: Record<string, unknown> = { enabled: true };
        if (metadata) payload.metadata = metadata;
        if (schedule) payload.schedule = schedule;
        if (evaluation) payload.evaluation = evaluation;
        if (proposed.state_transition !== undefined) payload.state_transition = proposed.state_transition;
        await rulesApi.updateRule(ruleId, payload as never);
        await markFindingApplied();
        const ruleUrl = basePath.prepend(paths.ruleDetails(ruleId));
        toasts.addSuccess({
          title: 'Rule re-enabled and tuned',
          text: toMountPoint(
            <p><EuiLink href={ruleUrl}>View updated rule</EuiLink></p>,
            { i18n: i18nStart, theme }
          ),
        });
      } else {
        await rulesApi.updateRule(ruleId, { enabled: false } as never);
        await markFindingApplied();
        toasts.addSuccess({ title: 'Rule disabled' });
      }
      navigateToUrl(basePath.prepend(paths.ruleList));
    } catch (err) {
      toasts.addDanger(`Failed to update rule: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUpdating(false);
    }
  }, [finding, rules, rulesApi, toasts, navigateToUrl, basePath, i18nStart, theme, ruleDoctorApi]);

  const handleCreateCoverageRule = useCallback(() => {
    if (!finding?.proposed) return;
    history.push('/create', {
      initialValues: mapProposedToFormValues(finding.proposed),
    });
  }, [finding, history]);

  if (!finding && !findingError) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (!finding) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        color="danger"
        title={<h2>Finding not available</h2>}
        body={<p>The requested recommendation could not be found. It may have been dismissed or deleted.</p>}
        actions={
          <EuiButton fill onClick={() => history.push('/doctor')}>
            Back to Rule Doctor
          </EuiButton>
        }
      />
    );
  }

  const renderDeduplicationFlow = () => {
    const columns: Array<EuiBasicTableColumn<RuleApiResponse>> = [
      {
        width: '40px',
        isExpander: true,
        render: (rule: RuleApiResponse) => (
          <EuiButtonIcon
            onClick={() => toggleRowExpansion(rule)}
            aria-label={expandedRows[rule.id] ? 'Collapse' : 'Expand'}
            iconType={expandedRows[rule.id] ? 'arrowDown' : 'arrowRight'}
          />
        ),
      },
      {
        field: 'metadata.name',
        name: 'Name',
        render: (_: string, rule: RuleApiResponse) => (
          <EuiLink href={paths.ruleDetails(rule.id)}>
            <strong>{rule.metadata.name}</strong>
          </EuiLink>
        ),
      },
      {
        field: 'kind',
        name: 'Kind',
        width: '100px',
        render: (kind: string) => (
          <EuiBadge color={kind === 'alert' ? 'warning' : 'primary'}>
            {kind.charAt(0).toUpperCase() + kind.slice(1)}
          </EuiBadge>
        ),
      },
      {
        field: 'schedule.every',
        name: 'Schedule',
        width: '100px',
        render: (_: string, rule: RuleApiResponse) => rule.schedule.every,
      },
      {
        field: 'enabled',
        name: 'Enabled',
        width: '90px',
        render: (enabled: boolean) => (
          <EuiBadge color={enabled ? 'success' : 'default'}>
            {enabled ? 'Yes' : 'No'}
          </EuiBadge>
        ),
      },
      {
        name: 'Action',
        width: '100px',
        render: (rule: RuleApiResponse) => {
          const isRetained = retainRuleId === rule.id;
          return (
            <EuiBadge
              color={isRetained ? 'success' : 'danger'}
              onClick={() => setRetainRuleId(rule.id)}
              onClickAriaLabel={`Retain ${rule.metadata.name}`}
            >
              {isRetained ? 'Retain' : 'Delete'}
            </EuiBadge>
          );
        },
      },
    ];

    const showCompare = retainedRule != null && finding.proposed != null;

    return (
      <>
        <EuiBasicTable
          items={rules}
          itemId="id"
          columns={columns}
          itemIdToExpandedRowMap={expandedRows}
        />

        {showCompare && (
          <>
            <EuiSpacer />
            <EuiTitle size="xs">
              <h3>Proposed Updates</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="none" responsive={false}>
              <EuiFlexItem>
                <EuiPanel hasBorder paddingSize="m">
                  <RuleDetailPanel rule={retainedRule!} />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasBorder paddingSize="m">
                  <ProposedRulePanel
                    proposed={finding.proposed!}
                    diffs={finding.diffs ?? []}
                    onUpdate={handleUpdate}
                    onEdit={handleEdit}
                    onEditWithAgent={agentBuilder ? handleEditWithAgent : undefined}
                    updating={updating}
                  />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}

        {!showCompare && retainRuleId == null && (
          <>
            <EuiSpacer />
            <EuiText size="s" color="subdued">
              Select a rule to retain to see the proposed changes.
            </EuiText>
          </>
        )}
      </>
    );
  };

  const renderThresholdTuningFlow = () => {
    const rule = rules[0];
    return (
      <>
        {rule && finding.proposed && (
          <>
            <EuiTitle size="xs">
              <h3>Current vs. Proposed Threshold</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="none" responsive={false}>
              <EuiFlexItem>
                <EuiPanel hasBorder paddingSize="m">
                  <RuleDetailPanel rule={rule} />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasBorder paddingSize="m">
                  <ProposedRulePanel
                    proposed={finding.proposed}
                    diffs={finding.diffs ?? []}
                    onUpdate={handleThresholdUpdate}
                    onEdit={() => {
                      history.push(`/edit/${encodeURIComponent(rule.id)}`, {
                        initialValues: mapProposedToFormValues(finding.proposed!),
                      });
                    }}
                    onEditWithAgent={agentBuilder ? handleEditWithAgent : undefined}
                    updating={updating}
                  />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
        {!rule && (
          <EuiText size="s" color="subdued">
            The affected rule could not be loaded.
          </EuiText>
        )}
      </>
    );
  };

  const renderStaleRuleFlow = () => {
    const rule = rules[0];
    const actionLabel =
      finding.action === 'delete'
        ? 'Delete rule'
        : finding.action === 're_enable_and_tune'
        ? 'Re-enable & tune'
        : 'Disable rule';
    const actionIcon =
      finding.action === 'delete'
        ? 'trash'
        : finding.action === 're_enable_and_tune'
        ? 'refresh'
        : 'eyeClosed';
    const actionColor = finding.action === 'delete' ? 'danger' : 'primary';

    return (
      <>
        {rule && (
          <>
            <EuiTitle size="xs">
              <h3>Stale Rule</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiPanel hasBorder paddingSize="m">
              <RuleDetailPanel rule={rule} />
              <EuiSpacer size="m" />
              <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    fill
                    color={actionColor}
                    iconType={actionIcon}
                    onClick={handleStaleAction}
                    isLoading={updating}
                  >
                    {actionLabel}
                  </EuiButton>
                </EuiFlexItem>
                {agentBuilder && (
                  <EuiFlexItem grow={false}>
                    <EuiButton size="s" iconType="sparkles" onClick={handleEditWithAgent}>
                      Discuss with agent
                    </EuiButton>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiPanel>
          </>
        )}
        {!rule && (
          <EuiText size="s" color="subdued">
            The affected rule could not be loaded.
          </EuiText>
        )}
      </>
    );
  };

  const renderCoverageGapFlow = () => (
    <>
      {finding.proposed && (
        <>
          <EuiTitle size="xs">
            <h3>Suggested New Rule</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="m">
            <ProposedRulePanel
              proposed={finding.proposed}
              diffs={finding.diffs ?? []}
              onUpdate={handleCreateCoverageRule}
              onEdit={handleCreateCoverageRule}
              onEditWithAgent={agentBuilder ? handleEditWithAgent : undefined}
              updating={false}
            />
          </EuiPanel>
        </>
      )}
      {rules.length > 0 && (
        <>
          <EuiSpacer />
          <EuiTitle size="xs">
            <h3>Related Existing Rules</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {rules.map((rule) => (
            <React.Fragment key={rule.id}>
              <EuiPanel hasBorder paddingSize="m">
                <RuleDetailPanel rule={rule} />
              </EuiPanel>
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
        </>
      )}
    </>
  );

  const renderFlowByType = () => {
    switch (finding.type) {
      case 'threshold_tuning':
        return renderThresholdTuningFlow();
      case 'stale_rule':
        return renderStaleRuleFlow();
      case 'coverage_gap':
        return renderCoverageGapFlow();
      default:
        return renderDeduplicationFlow();
    }
  };

  return (
    <>
      <EuiPageHeader
        pageTitle={`Fix: ${finding.summary}`}
        description={
          <>
            <EuiText size="xs" color="subdued">
              <strong>Rationale</strong>
            </EuiText>
            <EuiText size="s" color="subdued">
              {finding.explanation}
            </EuiText>
          </>
        }
        bottomBorder
        breadcrumbs={[
          { text: 'Rule Doctor', onClick: () => history.push('/doctor') },
          { text: 'Fix recommendation' },
        ]}
      />
      <EuiSpacer />
      {loading ? <EuiLoadingSpinner size="xl" /> : renderFlowByType()}
    </>
  );
};
