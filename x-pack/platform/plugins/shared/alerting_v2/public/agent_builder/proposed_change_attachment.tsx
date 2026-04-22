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

export const PROPOSED_CHANGE_ATTACHMENT_TYPE = 'rule_doctor_proposed_change';

export interface RelatedRuleInfo {
  id: string;
  name: string;
  kind: string;
  schedule: string;
  enabled: boolean;
  action: 'retain' | 'delete';
}

export interface ProposedChangeAttachmentData {
  proposed: string;
  diffs: string;
  ruleName: string;
  relatedRules?: string;
}

type ProposedChangeAttachment = Attachment<string, ProposedChangeAttachmentData>;

interface ParsedDiff {
  field: string;
  previous: unknown;
  proposed: unknown;
}

type DescItem = { title: NonNullable<React.ReactNode>; description: NonNullable<React.ReactNode> };

const safeJsonParse = <T,>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const safeGet = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const ProposedChangeInlineContent: React.FC<
  AttachmentRenderProps<ProposedChangeAttachment> & {
    onRuleClick?: (ruleId: string) => void;
  }
> = ({ attachment, onRuleClick }) => {
  const { proposed: proposedJson, diffs: diffsJson, ruleName, relatedRules: relatedRulesJson } =
    attachment.data;
  const proposed = safeJsonParse<Record<string, unknown>>(proposedJson, {});
  const diffs = safeJsonParse<ParsedDiff[]>(diffsJson, []);
  const relatedRules = safeJsonParse<RelatedRuleInfo[]>(relatedRulesJson ?? '[]', []);
  const changedFields = new Set(diffs.map((d) => d.field));

  const metadata = proposed.metadata as Record<string, unknown> | undefined;
  const schedule = proposed.schedule as Record<string, unknown> | undefined;

  const kind = (proposed.kind as string) ?? '';
  const every = (schedule?.every as string) ?? '';
  const description = metadata?.description as string | undefined;
  const query = safeGet(proposed, 'evaluation.query.base') as string | undefined;
  const tags = (metadata?.tags as string[]) ?? [];

  const changedBadge = (field: string) =>
    changedFields.has(field) ? (
      <>
        {' '}
        <EuiBadge color="accent">Changed</EuiBadge>
      </>
    ) : null;

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
      <EuiText size="xs">
        <strong>Rule:</strong> {ruleName}
      </EuiText>
      <EuiSpacer size="xs" />

      {kind && (
        <>
          <EuiText size="xs">
            <strong>Kind:</strong> {kind}
            {changedBadge('kind')}
          </EuiText>
          <EuiSpacer size="xs" />
        </>
      )}

      {every && (
        <>
          <EuiText size="xs">
            <strong>Schedule:</strong> {every}
            {changedBadge('schedule.every')}
          </EuiText>
          <EuiSpacer size="xs" />
        </>
      )}

      {description && (
        <>
          <EuiText size="xs">
            <strong>Description:</strong> {description}
            {changedBadge('metadata.description')}
          </EuiText>
          <EuiSpacer size="xs" />
        </>
      )}

      {query && (
        <>
          <EuiText size="xs">
            <strong>ES|QL query</strong>
            {changedBadge('evaluation.query.base')}
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" overflowHeight={150}>
            {query}
          </EuiCodeBlock>
          <EuiSpacer size="xs" />
        </>
      )}

      {tags.length > 0 && (
        <>
          <EuiText size="xs">
            <strong>Tags</strong>
            {changedBadge('metadata.tags')}
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
            {tags.map((tag) => (
              <EuiFlexItem grow={false} key={tag}>
                <EuiBadge color="hollow">{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </>
      )}

      {diffs.length > 0 && (
        <EuiText size="xs" color="subdued">
          {diffs.length} field{diffs.length === 1 ? '' : 's'} changed
        </EuiText>
      )}

      {relatedRules.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            <strong>Related rules</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          {relatedRules.map((rule) => (
            <EuiFlexGroup
              key={rule.id}
              responsive={false}
              gutterSize="s"
              alignItems="center"
              css={{ marginBottom: 2 }}
            >
              <EuiFlexItem grow={false}>
                <EuiBadge color={rule.action === 'retain' ? 'success' : 'danger'}>
                  {rule.action === 'retain' ? 'Retain' : 'Delete'}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow>
                <EuiText size="xs">
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
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {rule.kind} &middot; {rule.schedule}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
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

const ProposedChangeCanvasContent: React.FC<
  AttachmentRenderProps<ProposedChangeAttachment> & {
    focusedRuleId?: string;
  }
> = ({ attachment, focusedRuleId }) => {
  const rulesApi = useService(RulesApi);
  const { proposed: proposedJson, diffs: diffsJson, ruleName, relatedRules: relatedRulesJson } =
    attachment.data;
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

  return <FullDetailsCanvasContent
    rulesApi={rulesApi}
    ruleIds={ruleIds}
    actionById={actionById}
    diffs={diffs}
    ruleName={ruleName}
    proposedJson={proposedJson}
  />;
};

const FullDetailsCanvasContent: React.FC<{
  rulesApi: RulesApi;
  ruleIds: string[];
  actionById: Map<string, 'retain' | 'delete'>;
  diffs: ParsedDiff[];
  ruleName: string;
  proposedJson: string;
}> = ({ rulesApi, ruleIds, actionById, diffs, ruleName, proposedJson }) => {
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
      <EuiTitle size="s">
        <h3>Proposed change: {ruleName}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />

      {ruleIds.length > 0 && (
        <>
          <EuiTitle size="xs">
            <h4>Related rules</h4>
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
                <RuleDetailCard
                  rule={rule}
                  action={actionById.get(rule.id) ?? 'delete'}
                />
                <EuiSpacer size="s" />
              </React.Fragment>
            ))}
          <EuiSpacer size="m" />
        </>
      )}

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
                  {' → '}
                  <code>{JSON.stringify(d.proposed)}</code>
                </EuiText>
              ),
            }))}
          />
          <EuiSpacer size="m" />
        </>
      )}

      <EuiTitle size="xs">
        <h4>Proposed configuration</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable overflowHeight={400}>
        {JSON.stringify(safeJsonParse(proposedJson, {}), null, 2)}
      </EuiCodeBlock>
    </div>
  );
};

export const registerProposedChangeAttachment = ({
  attachments,
  container,
}: {
  attachments: AttachmentServiceStartContract;
  container: Container;
}): void => {
  let openCanvasRef: (() => void) | undefined;
  let focusedRuleId: string | undefined;

  attachments.addAttachmentType<ProposedChangeAttachment>(
    PROPOSED_CHANGE_ATTACHMENT_TYPE,
    {
      getLabel: (attachment) => attachment.data.ruleName ?? 'Proposed Rule Change',
      getIcon: () => 'sparkles',
      renderInlineContent: (props) => (
        <ProposedChangeInlineContent
          {...props}
          onRuleClick={(ruleId) => {
            focusedRuleId = ruleId;
            openCanvasRef?.();
          }}
        />
      ),
      renderCanvasContent: (props) => (
        <Context.Provider value={container}>
          <ProposedChangeCanvasContent {...props} focusedRuleId={focusedRuleId} />
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
    } satisfies AttachmentUIDefinition<ProposedChangeAttachment>
  );
};
