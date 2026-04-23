/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { Container } from 'inversify';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useQuery } from '@kbn/react-query';
import { Context, useService } from '@kbn/core-di-browser';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
  type AttachmentRenderProps,
  type AttachmentServiceStartContract,
} from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { RulesApi } from '../services/rules_api';
import type { RuleApiResponse } from '../services/rules_api';
import { paths } from '../constants';
import { ruleKeys } from '../hooks/query_key_factory';

export const RULE_SUGGESTION_ATTACHMENT_TYPE = 'rule_doctor_suggestion';

export interface RelatedRuleInfo {
  id: string;
  name: string;
  kind: string;
  schedule: string;
  enabled: boolean;
  action: 'retain' | 'delete';
}

export interface RuleSuggestionAttachmentData {
  findingId: string;
  findingType: string;
  action: string;
  impact: string;
  confidence: string;
  summary: string;
  explanation: string;
  proposed: string;
  diffs: string;
  ruleName: string;
  relatedRules?: string;
}

type RuleSuggestionAttachment = Attachment<string, RuleSuggestionAttachmentData>;

interface ParsedDiff {
  field: string;
  previous: unknown;
  proposed: unknown;
}

interface DescItem {
  title: NonNullable<React.ReactNode>;
  description: NonNullable<React.ReactNode>;
}

const FINDING_TYPE_COLORS: Record<string, string> = {
  deduplication: '#F5A623',
  threshold_tuning: '#9B59B6',
  stale_rule: '#E74C3C',
  coverage_gap: '#2980B9',
};

const IMPACT_BADGE: Record<string, { color: 'danger' | 'warning' | 'default'; label: string }> = {
  high: { color: 'danger', label: 'High impact' },
  medium: { color: 'warning', label: 'Medium impact' },
  low: { color: 'default', label: 'Low impact' },
};

const formatTypeName = (type: string): string =>
  type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const safeJsonParse = <T,>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const SuggestionInlineContent: React.FC<
  AttachmentRenderProps<RuleSuggestionAttachment> & {
    onRuleClick?: (ruleId: string) => void;
  }
> = ({ attachment, onRuleClick }) => {
  const {
    findingType,
    action,
    impact,
    summary,
    explanation,
    diffs: diffsJson,
    relatedRules: relatedRulesJson,
  } = attachment.data;

  const typeColor = FINDING_TYPE_COLORS[findingType] ?? '#95A5A6';
  const diffs = safeJsonParse<ParsedDiff[]>(diffsJson, []);
  const relatedRules = safeJsonParse<RelatedRuleInfo[]>(relatedRulesJson ?? '[]', []);
  const impactMeta = IMPACT_BADGE[impact];

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      hasBorder
      css={css`
        border-left: 4px solid ${typeColor};
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color={typeColor}>{formatTypeName(findingType)}</EuiBadge>
        </EuiFlexItem>
        {impactMeta && (
          <EuiFlexItem grow={false}>
            <EuiBadge color={impactMeta.color}>{impactMeta.label}</EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{summary}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{action}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        {explanation}
      </EuiText>

      {relatedRules.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            <strong>Impacted rules</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="s" wrap responsive={false} alignItems="center">
            {relatedRules.map((rule) => (
              <EuiFlexItem key={rule.id} grow={false}>
                <EuiBadge color="hollow">
                  <EuiLink
                    href={paths.ruleDetails(rule.id)}
                    onClick={(e: React.MouseEvent) => {
                      if (onRuleClick) {
                        e.preventDefault();
                        onRuleClick(rule.id);
                      }
                    }}
                  >
                    {rule.name}
                  </EuiLink>
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}

      {diffs.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {diffs.length} field{diffs.length === 1 ? '' : 's'} changed
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
};

const RuleDetailCard: React.FC<{
  rule: RuleApiResponse;
  action: 'retain' | 'delete';
}> = ({ rule, action }) => {
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
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>
              <EuiLink href={paths.ruleDetails(rule.id)}>{rule.metadata.name}</EuiLink>
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={action === 'retain' ? 'success' : 'danger'}>
            {action === 'retain' ? 'Retain' : 'Delete'}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiDescriptionList type="column" listItems={items} compressed />
    </EuiPanel>
  );
};

const SingleRuleCanvasContent: React.FC<{
  ruleId: string;
  action: 'retain' | 'delete';
}> = ({ ruleId, action }) => {
  const rulesApi = useService(RulesApi);
  const {
    data: fetchedRules,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ruleKeys.detail(ruleId),
    queryFn: () => rulesApi.getRulesByIds([ruleId]),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const rule = fetchedRules?.items?.[0];

  if (isLoading) return <EuiLoadingSpinner size="l" />;
  if (isError || !rule) {
    return (
      <EuiText size="s" color="danger">
        Failed to load rule details.
      </EuiText>
    );
  }

  return <RuleDetailCard rule={rule} action={action} />;
};

const SuggestionCanvasContent: React.FC<
  AttachmentRenderProps<RuleSuggestionAttachment> & {
    focusedRuleId?: string;
  }
> = ({ attachment, focusedRuleId }) => {
  const rulesApi = useService(RulesApi);
  const {
    findingType,
    action,
    impact,
    confidence,
    summary,
    explanation,
    proposed: proposedJson,
    diffs: diffsJson,
    ruleName,
    relatedRules: relatedRulesJson,
  } = attachment.data;

  const typeColor = FINDING_TYPE_COLORS[findingType] ?? '#95A5A6';
  const relatedRules = useMemo(
    () => safeJsonParse<RelatedRuleInfo[]>(relatedRulesJson ?? '[]', []),
    [relatedRulesJson]
  );
  const actionById = useMemo(
    () => new Map(relatedRules.map((r) => [r.id, r.action])),
    [relatedRules]
  );

  if (focusedRuleId) {
    return (
      <div style={{ padding: 16, overflow: 'auto', height: '100%' }}>
        <SingleRuleCanvasContent
          ruleId={focusedRuleId}
          action={actionById.get(focusedRuleId) ?? 'delete'}
        />
      </div>
    );
  }

  const ruleIds = relatedRules.map((r) => r.id);
  const diffs = safeJsonParse<ParsedDiff[]>(diffsJson, []);
  const impactMeta = IMPACT_BADGE[impact];
  const isCoverageGap = findingType === 'coverage_gap';

  return (
    <CanvasFullView
      rulesApi={rulesApi}
      ruleIds={ruleIds}
      actionById={actionById}
      diffs={diffs}
      ruleName={ruleName}
      proposedJson={proposedJson}
      findingType={findingType}
      typeColor={typeColor}
      action={action}
      impact={impact}
      impactMeta={impactMeta}
      confidence={confidence}
      summary={summary}
      explanation={explanation}
      isCoverageGap={isCoverageGap}
    />
  );
};

const CanvasFullView: React.FC<{
  rulesApi: RulesApi;
  ruleIds: string[];
  actionById: Map<string, 'retain' | 'delete'>;
  diffs: ParsedDiff[];
  ruleName: string;
  proposedJson: string;
  findingType: string;
  typeColor: string;
  action: string;
  impact: string;
  impactMeta: { color: 'danger' | 'warning' | 'default'; label: string } | undefined;
  confidence: string;
  summary: string;
  explanation: string;
  isCoverageGap: boolean;
}> = ({
  rulesApi,
  ruleIds,
  actionById,
  diffs,
  ruleName,
  proposedJson,
  findingType,
  typeColor,
  action,
  impact,
  impactMeta,
  confidence,
  summary,
  explanation,
  isCoverageGap,
}) => {
  const {
    data: fetchedRules,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ruleKeys.list({ page: 1, perPage: ruleIds.length, filter: ruleIds.join(',') }),
    queryFn: () => rulesApi.getRulesByIds(ruleIds),
    enabled: ruleIds.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const rules = fetchedRules?.items ?? [];

  return (
    <div style={{ padding: 16, overflow: 'auto', height: '100%' }}>
      {/* Header */}
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color={typeColor}>{formatTypeName(findingType)}</EuiBadge>
        </EuiFlexItem>
        {impactMeta && (
          <EuiFlexItem grow={false}>
            <EuiBadge color={impactMeta.color}>{impactMeta.label}</EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">Confidence: {confidence}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{action}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiTitle size="s">
        <h3>{summary}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {/* Explanation */}
      <EuiText size="s" color="subdued">
        {explanation}
      </EuiText>
      <EuiSpacer size="m" />

      {/* Impacted rules */}
      {ruleIds.length > 0 && (
        <>
          <EuiTitle size="xs">
            <h4>{isCoverageGap ? 'Related existing rules' : 'Impacted rules'}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />

          {isLoading && <EuiLoadingSpinner size="l" />}
          {isError && (
            <EuiText size="s" color="danger">
              Failed to load rule details.
            </EuiText>
          )}
          {!isLoading &&
            !isError &&
            rules.map((rule) => (
              <React.Fragment key={rule.id}>
                <RuleDetailCard rule={rule} action={actionById.get(rule.id) ?? 'delete'} />
                <EuiSpacer size="s" />
              </React.Fragment>
            ))}
          <EuiSpacer size="m" />
        </>
      )}

      {/* Field changes */}
      {diffs.length > 0 && (
        <>
          <EuiTitle size="xs">
            <h4>Field changes</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList
            type="column"
            compressed
            listItems={diffs.map((d) => ({
              title: d.field,
              description: (
                <EuiText size="xs">
                  <code>{JSON.stringify(d.previous)}</code>
                  {' \u2192 '}
                  <code>{JSON.stringify(d.proposed)}</code>
                </EuiText>
              ),
            }))}
          />
          <EuiSpacer size="m" />
        </>
      )}

      {/* Proposed configuration */}
      <EuiTitle size="xs">
        <h4>{isCoverageGap ? 'Suggested new rule' : 'Proposed configuration'}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <strong>Rule:</strong> {ruleName}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable overflowHeight={400}>
        {JSON.stringify(safeJsonParse(proposedJson, {}), null, 2)}
      </EuiCodeBlock>
    </div>
  );
};

export const registerRuleSuggestionAttachment = ({
  attachments,
  container,
}: {
  attachments: AttachmentServiceStartContract;
  container: Container;
}): void => {
  let openCanvasRef: (() => void) | undefined;
  let focusedRuleId: string | undefined;

  attachments.addAttachmentType<RuleSuggestionAttachment>(RULE_SUGGESTION_ATTACHMENT_TYPE, {
    getLabel: (attachment) =>
      attachment.data.summary ?? attachment.data.ruleName ?? 'Rule Suggestion',
    getIcon: () => 'sparkles',
    renderInlineContent: (props) => (
      <SuggestionInlineContent
        {...props}
        onRuleClick={(ruleId) => {
          focusedRuleId = ruleId;
          openCanvasRef?.();
        }}
      />
    ),
    renderCanvasContent: (props) => (
      <Context.Provider value={container}>
        <SuggestionCanvasContent {...props} focusedRuleId={focusedRuleId} />
      </Context.Provider>
    ),
    getActionButtons: ({ openCanvas, isCanvas }) => {
      if (!isCanvas) {
        openCanvasRef = openCanvas;
      }
      if (isCanvas || !openCanvas) return [];
      return [
        {
          label: 'View details',
          icon: 'expand',
          type: ActionButtonType.SECONDARY,
          handler: () => {
            focusedRuleId = undefined;
            openCanvas();
          },
        },
      ];
    },
  } satisfies AttachmentUIDefinition<RuleSuggestionAttachment>);
};
