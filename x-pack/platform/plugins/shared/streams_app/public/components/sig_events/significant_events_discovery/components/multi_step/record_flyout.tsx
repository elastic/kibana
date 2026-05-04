/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiCodeBlock,
  EuiDescriptionList,
  type EuiDescriptionListProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHealth,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FlyoutMetadataCard } from '../../../../flyout_components/flyout_metadata_card';
import type { DiscoveryKind } from '../../../../../hooks/sig_events/use_discovery_records';
import {
  DiscoverEsqlButton,
  extractExecutionIdFromCompositeId,
  RuleLink,
  StreamLink,
  WorkflowExecutionLink,
} from './links';
import {
  ACTION_COLOR,
  criticalityColor,
  renderStreamBadges,
  renderTimestamp,
} from './tables/common';
import type {
  BaseRecord,
  DetectionRow,
  DiscoveryItemRow,
  EmbeddedDetectionRef,
  Evidence,
  SigEventRow,
  VerdictRow,
} from './types';

const VERDICT_COLOR: Record<string, string> = {
  promoted: 'danger',
  acknowledged: 'warning',
  demoted: 'default',
  challenge: 'accent',
};

const IMPACT_COLOR: Record<string, string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'default',
};

const STATUS_COLOR: Record<string, string> = {
  active: 'danger',
  detected: 'danger',
  detections_cleared: 'success',
  resolved: 'success',
  superseded: 'warning',
};

interface RecordFlyoutProps {
  kind: DiscoveryKind;
  record: BaseRecord & Record<string, unknown>;
  onClose: () => void;
  onNavigateTo?: (kind: DiscoveryKind, id: string) => void;
}

function getDisplayTitle(
  kind: DiscoveryKind,
  record: BaseRecord & Record<string, unknown>
): string {
  if (kind === 'verdicts') {
    return (
      (typeof record.title === 'string' && record.title) ||
      (typeof record.verdict_summary === 'string' && record.verdict_summary) ||
      (typeof record.discovery_id === 'string' && record.discovery_id) ||
      record._id
    );
  }
  if (kind === 'detections') {
    return (
      (typeof record.rule_name === 'string' && record.rule_name) ||
      (typeof record.rule_uuid === 'string' && record.rule_uuid) ||
      record._id
    );
  }
  return (
    (typeof record.title === 'string' && record.title) ||
    (typeof record.discovery_id === 'string' && record.discovery_id) ||
    record._id
  );
}

export function RecordFlyout({ kind, record, onClose, onNavigateTo }: RecordFlyoutProps) {
  const titleId = useGeneratedHtmlId({ prefix: 'streamsDiscoveryRecordFlyoutTitle' });
  const title = getDisplayTitle(kind, record);

  const cards = useMemo(() => renderMetadataCards(kind, record), [kind, record]);
  const detailItems = useMemo(
    () => renderDetailItems(kind, record, onNavigateTo),
    [kind, record, onNavigateTo]
  );
  const evidences = useMemo(() => extractEvidences(record), [record]);
  const embeddedDetections = useMemo(
    () => (kind === 'discoveries' ? extractEmbeddedDetections(record) : []),
    [kind, record]
  );

  const { _id: _omittedId, _index: _omittedIndex, ...source } = record;

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={titleId}
      size="m"
      ownFocus={false}
      data-test-subj="streamsDiscoveryRecordFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{title}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <code>{`${record._index} / ${record._id}`}</code>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {cards.length > 0 && (
          <>
            <EuiFlexGroup gutterSize="s" wrap responsive={false}>
              {cards.map((card) => (
                <EuiFlexItem grow={false} key={card.title} style={{ minWidth: 160 }}>
                  <FlyoutMetadataCard title={card.title}>{card.value}</FlyoutMetadataCard>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </>
        )}
        {detailItems.length > 0 && (
          <>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate(
                  'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.detailsTitle',
                  { defaultMessage: 'Details' }
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="column"
              columnWidths={[1, 3]}
              compressed
              listItems={detailItems}
            />
            <EuiHorizontalRule margin="m" />
          </>
        )}
        {embeddedDetections.length > 0 && onNavigateTo && (
          <>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate(
                  'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.relatedDetectionsTitle',
                  { defaultMessage: 'Related detections' }
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EmbeddedDetectionsTable items={embeddedDetections} onNavigateTo={onNavigateTo} />
            <EuiHorizontalRule margin="m" />
          </>
        )}
        {evidences.length > 0 && (
          <>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate(
                  'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.evidencesTitle',
                  { defaultMessage: 'Evidence' }
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EvidencesPanels evidences={evidences} />
            <EuiHorizontalRule margin="m" />
          </>
        )}
        <EuiAccordion
          id="streamsDiscoveryRecordFlyoutRawJson"
          buttonContent={
            <EuiText size="s">
              <strong>
                {i18n.translate(
                  'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.rawJsonTitle',
                  { defaultMessage: 'Raw document' }
                )}
              </strong>
            </EuiText>
          }
          initialIsOpen={false}
          paddingSize="s"
        >
          <EuiCodeBlock
            language="json"
            isCopyable
            overflowHeight={500}
            fontSize="s"
            paddingSize="s"
          >
            {JSON.stringify(source, null, 2)}
          </EuiCodeBlock>
        </EuiAccordion>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}

interface MetadataCardSpec {
  title: string;
  value: React.ReactNode;
}

function renderMetadataCards(
  kind: DiscoveryKind,
  record: BaseRecord & Record<string, unknown>
): MetadataCardSpec[] {
  switch (kind) {
    case 'events':
      return renderEventCards(record as unknown as SigEventRow);
    case 'detections':
      return renderDetectionCards(record as unknown as DetectionRow);
    case 'discoveries':
      return renderDiscoveryCards(record as unknown as DiscoveryItemRow);
    case 'verdicts':
      return renderVerdictCards(record as unknown as VerdictRow);
    default:
      return [];
  }
}

function renderEventCards(row: SigEventRow): MetadataCardSpec[] {
  const cards: MetadataCardSpec[] = [];
  if (row.verdict) {
    cards.push({
      title: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.verdictLabel',
        { defaultMessage: 'Verdict' }
      ),
      value: <EuiBadge color={VERDICT_COLOR[row.verdict] ?? 'hollow'}>{row.verdict}</EuiBadge>,
    });
  }
  if (typeof row.criticality === 'number') {
    cards.push({
      title: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.criticalityLabel',
        { defaultMessage: 'Criticality' }
      ),
      value: <EuiBadge color={criticalityColor(row.criticality)}>{row.criticality}</EuiBadge>,
    });
  }
  if (row.impact) {
    cards.push({
      title: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.impactLabel', {
        defaultMessage: 'Impact',
      }),
      value: <EuiBadge color={IMPACT_COLOR[row.impact] ?? 'default'}>{row.impact}</EuiBadge>,
    });
  }
  if (row.recommended_action) {
    cards.push({
      title: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.actionLabel', {
        defaultMessage: 'Action',
      }),
      value: (
        <EuiBadge color={ACTION_COLOR[row.recommended_action] ?? 'default'}>
          {row.recommended_action}
        </EuiBadge>
      ),
    });
  }
  return cards;
}

function renderDetectionCards(row: DetectionRow): MetadataCardSpec[] {
  const cards: MetadataCardSpec[] = [];
  if (row.status) {
    cards.push({
      title: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.statusLabel', {
        defaultMessage: 'Status',
      }),
      value: <EuiHealth color={STATUS_COLOR[row.status] ?? 'subdued'}>{row.status}</EuiHealth>,
    });
  }
  if (typeof row.alert_count === 'number') {
    cards.push({
      title: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.alertsLabel', {
        defaultMessage: 'Alerts',
      }),
      value: <EuiBadge color="hollow">{row.alert_count}</EuiBadge>,
    });
  }
  if (typeof row.peak_30m_alert_count === 'number') {
    cards.push({
      title: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.peak30mLabel',
        { defaultMessage: 'Peak 30m' }
      ),
      value: <EuiBadge color="hollow">{row.peak_30m_alert_count}</EuiBadge>,
    });
  }
  return cards;
}

function renderDiscoveryCards(row: DiscoveryItemRow): MetadataCardSpec[] {
  const cards: MetadataCardSpec[] = [];
  if (row.status) {
    cards.push({
      title: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.statusLabel', {
        defaultMessage: 'Status',
      }),
      value: <EuiHealth color={STATUS_COLOR[row.status] ?? 'subdued'}>{row.status}</EuiHealth>,
    });
  }
  if (typeof row.criticality === 'number') {
    cards.push({
      title: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.criticalityLabel',
        { defaultMessage: 'Criticality' }
      ),
      value: <EuiBadge color={criticalityColor(row.criticality)}>{row.criticality}</EuiBadge>,
    });
  }
  if (typeof row.confidence === 'number') {
    cards.push({
      title: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.confidenceLabel',
        { defaultMessage: 'Confidence' }
      ),
      value: <EuiBadge color="hollow">{row.confidence}%</EuiBadge>,
    });
  }
  if (row.recommended_action) {
    cards.push({
      title: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.actionLabel', {
        defaultMessage: 'Action',
      }),
      value: (
        <EuiBadge color={ACTION_COLOR[row.recommended_action] ?? 'default'}>
          {row.recommended_action}
        </EuiBadge>
      ),
    });
  }
  return cards;
}

function renderVerdictCards(row: VerdictRow): MetadataCardSpec[] {
  const cards: MetadataCardSpec[] = [];
  if (row.verdict) {
    cards.push({
      title: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.verdictLabel',
        { defaultMessage: 'Verdict' }
      ),
      value: <EuiHealth color={VERDICT_COLOR[row.verdict] ?? 'subdued'}>{row.verdict}</EuiHealth>,
    });
  }
  if (typeof row.criticality === 'number') {
    cards.push({
      title: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.criticalityLabel',
        { defaultMessage: 'Criticality' }
      ),
      value: <EuiBadge color={criticalityColor(row.criticality)}>{row.criticality}</EuiBadge>,
    });
  }
  if (typeof row.confidence === 'number') {
    cards.push({
      title: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.confidenceLabel',
        { defaultMessage: 'Confidence' }
      ),
      value: <EuiBadge color="hollow">{row.confidence}%</EuiBadge>,
    });
  }
  if (row.recommended_action) {
    cards.push({
      title: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.actionLabel', {
        defaultMessage: 'Action',
      }),
      value: (
        <EuiBadge color={ACTION_COLOR[row.recommended_action] ?? 'default'}>
          {row.recommended_action}
        </EuiBadge>
      ),
    });
  }
  return cards;
}

type DetailItem = NonNullable<EuiDescriptionListProps['listItems']>[number];

function pushIf(items: DetailItem[], item: DetailItem | null) {
  if (item) items.push(item);
}

function timestampItem(row: { '@timestamp'?: string }): DetailItem | null {
  if (!row['@timestamp']) return null;
  return {
    title: i18n.translate(
      'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.timestampLabel',
      { defaultMessage: 'Timestamp' }
    ),
    description: renderTimestamp(row['@timestamp']),
  };
}

function streamsItem(row: { stream_names?: string[] }): DetailItem | null {
  if (!Array.isArray(row.stream_names) || row.stream_names.length === 0) return null;
  return {
    title: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.streamsLabel', {
      defaultMessage: 'Streams',
    }),
    description: renderStreamBadges(row.stream_names),
  };
}

function renderRuleNamesList(names: string[]) {
  // We don't have rule_uuid alongside rule_names at the parent record level
  // (events / discoveries / verdicts), so these can't be deep-linked to the
  // Stack Management rule details page. Render as plain badges.
  return (
    <EuiFlexGroup wrap gutterSize="xs" responsive={false}>
      {names.map((r) => (
        <EuiFlexItem grow={false} key={r}>
          <EuiBadge color="hollow">{r}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

function renderDetailItems(
  kind: DiscoveryKind,
  record: BaseRecord & Record<string, unknown>,
  onNavigateTo?: (kind: DiscoveryKind, id: string) => void
): DetailItem[] {
  const items: DetailItem[] = [];

  if (kind === 'events') {
    const row = record as unknown as SigEventRow;
    pushIf(items, timestampItem(row));
    pushIf(items, {
      title: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.titleLabel', {
        defaultMessage: 'Title',
      }),
      description: <EuiText size="s">{row.title}</EuiText>,
    });
    if (row.summary) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.summaryLabel',
          { defaultMessage: 'Summary' }
        ),
        description: <EuiText size="s">{row.summary}</EuiText>,
      });
    }
    if (row.root_cause) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.rootCauseLabel',
          { defaultMessage: 'Root cause' }
        ),
        description: <EuiText size="s">{row.root_cause}</EuiText>,
      });
    }
    pushIf(items, streamsItem(row));
    if (row.discovery_id) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.discoveryLabel',
          { defaultMessage: 'Discovery' }
        ),
        description: onNavigateTo ? (
          <EuiLink onClick={() => onNavigateTo('discoveries', row.discovery_id!)}>
            <EuiText size="xs">
              <code>{row.discovery_id}</code>
            </EuiText>
          </EuiLink>
        ) : (
          <EuiText size="xs">
            <code>{row.discovery_id}</code>
          </EuiText>
        ),
      });
    }
    if (row.verdict_id) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.verdictIdLabel',
          { defaultMessage: 'Verdict' }
        ),
        description: onNavigateTo ? (
          <EuiLink onClick={() => onNavigateTo('verdicts', row.verdict_id!)}>
            <EuiText size="xs">
              <code>{row.verdict_id}</code>
            </EuiText>
          </EuiLink>
        ) : (
          <EuiText size="xs">
            <code>{row.verdict_id}</code>
          </EuiText>
        ),
      });
    }
    if (Array.isArray(row.rule_names) && row.rule_names.length > 0) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.rulesLabel',
          { defaultMessage: 'Rules' }
        ),
        description: renderRuleNamesList(row.rule_names),
      });
    }
    if (Array.isArray(row.recommendations) && row.recommendations.length > 0) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.recommendationsLabel',
          { defaultMessage: 'Recommendations' }
        ),
        description: (
          <EuiText size="s">
            <ul>
              {row.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </EuiText>
        ),
      });
    }
    // Events don't store the workflow execution id directly; recover it from
    // the verdict_id / discovery_id prefix (both use the same composite shape
    // <execution-uuid>-<discovery_slug>).
    {
      const verdictExecId = extractExecutionIdFromCompositeId(row.verdict_id);
      const discoveryExecId = extractExecutionIdFromCompositeId(row.discovery_id);
      if (verdictExecId) {
        pushIf(items, {
          title: i18n.translate(
            'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.verdictRunLabel',
            { defaultMessage: 'Verdict run' }
          ),
          description: <WorkflowExecutionLink executionId={verdictExecId} />,
        });
      }
      if (discoveryExecId && discoveryExecId !== verdictExecId) {
        pushIf(items, {
          title: i18n.translate(
            'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.discoveryRunLabel',
            { defaultMessage: 'Discovery run' }
          ),
          description: <WorkflowExecutionLink executionId={discoveryExecId} />,
        });
      }
    }
    return items;
  }

  if (kind === 'detections') {
    const row = record as unknown as DetectionRow;
    pushIf(items, timestampItem(row));
    pushIf(items, {
      title: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.ruleNameLabel',
        { defaultMessage: 'Rule' }
      ),
      description: <RuleLink name={row.rule_name} uuid={row.rule_uuid} />,
    });
    if (row.rule_uuid) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.ruleUuidLabel',
          { defaultMessage: 'Rule UUID' }
        ),
        description: (
          <EuiText size="xs">
            <code>{row.rule_uuid}</code>
          </EuiText>
        ),
      });
    }
    if (row.stream) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.streamLabel',
          { defaultMessage: 'Stream' }
        ),
        description: <StreamLink name={row.stream} />,
      });
    }
    if (row.change_type) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.changeTypeLabel',
          { defaultMessage: 'Change type' }
        ),
        description: <EuiBadge color="hollow">{Object.keys(row.change_type)[0] ?? '—'}</EuiBadge>,
      });
    }
    if (row.detection_evidence?.p_value != null) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.pValueLabel',
          { defaultMessage: 'p-value' }
        ),
        description: <EuiText size="s">{row.detection_evidence.p_value.toExponential(2)}</EuiText>,
      });
    }
    if (row.parent_detection_id && onNavigateTo) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.parentDetectionLabel',
          { defaultMessage: 'Parent detection' }
        ),
        description: (
          <EuiLink onClick={() => onNavigateTo('detections', row.parent_detection_id!)}>
            <EuiText size="xs">
              <code>{row.parent_detection_id}</code>
            </EuiText>
          </EuiLink>
        ),
      });
    }
    if (row.workflow_execution_id) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.detectionRunLabel',
          { defaultMessage: 'Detection run' }
        ),
        description: <WorkflowExecutionLink executionId={row.workflow_execution_id} />,
      });
    }
    if (row.processed_by) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.processedByLabel',
          { defaultMessage: 'Processed by run' }
        ),
        description: <WorkflowExecutionLink executionId={row.processed_by} />,
      });
    }
    return items;
  }

  if (kind === 'discoveries') {
    const row = record as unknown as DiscoveryItemRow;
    pushIf(items, timestampItem(row));
    pushIf(items, {
      title: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.titleLabel', {
        defaultMessage: 'Title',
      }),
      description: <EuiText size="s">{row.title}</EuiText>,
    });
    if (row.summary) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.summaryLabel',
          { defaultMessage: 'Summary' }
        ),
        description: <EuiText size="s">{row.summary}</EuiText>,
      });
    }
    if (row.discovery_id) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.discoveryIdLabel',
          { defaultMessage: 'Discovery ID' }
        ),
        description: (
          <EuiText size="xs">
            <code>{row.discovery_id}</code>
          </EuiText>
        ),
      });
    }
    pushIf(items, streamsItem(row));
    if (Array.isArray(row.rule_names) && row.rule_names.length > 0) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.rulesLabel',
          { defaultMessage: 'Rules' }
        ),
        description: renderRuleNamesList(row.rule_names),
      });
    }
    if (row.previous_discovery_id && onNavigateTo) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.previousDiscoveryLabel',
          { defaultMessage: 'Previous discovery' }
        ),
        description: (
          <EuiLink onClick={() => onNavigateTo('discoveries', row.previous_discovery_id!)}>
            <EuiText size="xs">
              <code>{row.previous_discovery_id}</code>
            </EuiText>
          </EuiLink>
        ),
      });
    }
    if (row.closes && onNavigateTo) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.closesDiscoveryLabel',
          { defaultMessage: 'Closes discovery' }
        ),
        description: (
          <EuiLink onClick={() => onNavigateTo('discoveries', row.closes!)}>
            <EuiText size="xs">
              <code>{row.closes}</code>
            </EuiText>
          </EuiLink>
        ),
      });
    }
    if (row.workflow_execution_id) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.discoveryRunLabel',
          { defaultMessage: 'Discovery run' }
        ),
        description: <WorkflowExecutionLink executionId={row.workflow_execution_id} />,
      });
    }
    if (row.superseded_by_execution_id) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.supersededByRunLabel',
          { defaultMessage: 'Superseded by run' }
        ),
        description: <WorkflowExecutionLink executionId={row.superseded_by_execution_id} />,
      });
    }
    return items;
  }

  // verdicts
  const row = record as unknown as VerdictRow;
  pushIf(items, timestampItem(row));
  if (row.discovery_id) {
    pushIf(items, {
      title: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.discoveryIdLabel',
        { defaultMessage: 'Discovery ID' }
      ),
      description: onNavigateTo ? (
        <EuiLink onClick={() => onNavigateTo('discoveries', row.discovery_id)}>
          <EuiText size="xs">
            <code>{row.discovery_id}</code>
          </EuiText>
        </EuiLink>
      ) : (
        <EuiText size="xs">
          <code>{row.discovery_id}</code>
        </EuiText>
      ),
    });
  }
  if (row.verdict_summary) {
    pushIf(items, {
      title: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.summaryLabel',
        { defaultMessage: 'Summary' }
      ),
      description: <EuiText size="s">{row.verdict_summary}</EuiText>,
    });
  }
  if (row.assessment_note) {
    pushIf(items, {
      title: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.assessmentNoteLabel',
        { defaultMessage: 'Assessment note' }
      ),
      description: <EuiText size="s">{row.assessment_note}</EuiText>,
    });
  }
  if (row.delta_reasoning) {
    pushIf(items, {
      title: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.deltaReasoningLabel',
        { defaultMessage: 'Delta reasoning' }
      ),
      description: <EuiText size="s">{row.delta_reasoning}</EuiText>,
    });
  }
  if (row.original_verdict) {
    pushIf(items, {
      title: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.originalVerdictLabel',
        { defaultMessage: 'Original verdict' }
      ),
      description: (
        <EuiBadge color={VERDICT_COLOR[row.original_verdict] ?? 'hollow'}>
          {row.original_verdict}
        </EuiBadge>
      ),
    });
  }
  pushIf(items, streamsItem(row as unknown as { stream_names?: string[] }));
  // Verdicts don't store the workflow execution id directly. The verdict_id
  // (and the doc _id) prefix is the verdict-run execution uuid; the
  // discovery_id prefix is the discovery-run execution uuid.
  {
    const verdictExecId =
      extractExecutionIdFromCompositeId(row.verdict_id) ??
      extractExecutionIdFromCompositeId(row._id);
    const discoveryExecId = extractExecutionIdFromCompositeId(row.discovery_id);
    if (verdictExecId) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.verdictRunLabel',
          { defaultMessage: 'Verdict run' }
        ),
        description: <WorkflowExecutionLink executionId={verdictExecId} />,
      });
    }
    if (discoveryExecId && discoveryExecId !== verdictExecId) {
      pushIf(items, {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.discoveryRunLabel',
          { defaultMessage: 'Discovery run' }
        ),
        description: <WorkflowExecutionLink executionId={discoveryExecId} />,
      });
    }
  }
  return items;
}

/**
 * Per-evidence card with a description and (when present) an Open in
 * Discover button that runs the ES|QL query.
 */
function EvidencesPanels({ evidences }: { evidences: Evidence[] }) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
      {evidences.map((ev, i) => (
        <EuiFlexItem grow={false} key={i}>
          <EuiPanel hasShadow={false} hasBorder paddingSize="s">
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
              {ev.rule_name ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{ev.rule_name}</EuiBadge>
                </EuiFlexItem>
              ) : null}
              {ev.stream_name ? (
                <EuiFlexItem grow={false}>
                  <StreamLink name={ev.stream_name} />
                </EuiFlexItem>
              ) : null}
              {ev.result ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color={ev.result === 'found' ? 'warning' : 'default'}>
                    {ev.result}
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              {typeof ev.row_count === 'number' ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.evidenceRowCount',
                      {
                        defaultMessage: '{count, plural, one {# row} other {# rows}}',
                        values: { count: ev.row_count },
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              {ev.esql_query ? (
                <EuiFlexItem grow={false}>
                  <DiscoverEsqlButton esql={ev.esql_query} />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            {ev.description ? (
              <>
                <EuiSpacer size="xs" />
                <EuiText size="s">{ev.description}</EuiText>
              </>
            ) : null}
            {ev.esql_query ? (
              <>
                <EuiSpacer size="xs" />
                <EuiCodeBlock language="sql" fontSize="s" paddingSize="s" isCopyable>
                  {ev.esql_query}
                </EuiCodeBlock>
              </>
            ) : null}
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

function EmbeddedDetectionsTable({
  items,
  onNavigateTo,
}: {
  items: EmbeddedDetectionRef[];
  onNavigateTo: (kind: DiscoveryKind, id: string) => void;
}) {
  const columns: Array<EuiBasicTableColumn<EmbeddedDetectionRef>> = [
    {
      field: 'detected_at',
      name: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.embeddedDetectionTimestamp',
        { defaultMessage: 'Detected at' }
      ),
      width: '180px',
      render: (v?: string) => renderTimestamp(v),
    },
    {
      name: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.embeddedDetectionRule',
        { defaultMessage: 'Rule' }
      ),
      render: (row: EmbeddedDetectionRef) =>
        row.rule_name ? <RuleLink name={row.rule_name} uuid={row.rule_uuid} /> : '—',
    },
    {
      field: 'stream_name',
      name: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.embeddedDetectionStream',
        { defaultMessage: 'Stream' }
      ),
      width: '180px',
      render: (v?: string) => (v ? <StreamLink name={v} /> : '—'),
    },
    {
      field: 'event_count',
      name: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.embeddedDetectionEvents',
        { defaultMessage: 'Events' }
      ),
      width: '80px',
      align: 'right' as const,
    },
    {
      name: i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.embeddedDetectionId',
        { defaultMessage: 'Detection' }
      ),
      width: '180px',
      render: (row: EmbeddedDetectionRef) =>
        row.detection_id ? (
          <EuiLink onClick={() => onNavigateTo('detections', row.detection_id!)}>
            <EuiText size="xs">
              <code>{row.detection_id.slice(0, 24)}…</code>
            </EuiText>
          </EuiLink>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <EuiBasicTable<EmbeddedDetectionRef>
      tableCaption={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.recordFlyout.embeddedDetectionsCaption',
        { defaultMessage: 'Detections grouped into this discovery.' }
      )}
      compressed
      items={items}
      columns={columns}
      noItemsMessage="—"
    />
  );
}

function extractEvidences(record: BaseRecord & Record<string, unknown>): Evidence[] {
  const raw = record.evidences;
  if (!Array.isArray(raw)) return [];
  return raw.filter((e): e is Evidence => typeof e === 'object' && e !== null);
}

function extractEmbeddedDetections(
  record: BaseRecord & Record<string, unknown>
): EmbeddedDetectionRef[] {
  const raw = record.detections;
  if (!Array.isArray(raw)) return [];
  return raw.filter((e): e is EmbeddedDetectionRef => typeof e === 'object' && e !== null);
}
