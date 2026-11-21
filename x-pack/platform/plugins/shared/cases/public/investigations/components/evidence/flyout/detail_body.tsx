/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { INDICATOR_TYPE_LABELS } from '../../../../../common/investigations/types';
import type { EvidenceItem, EvidenceSnapshot } from '../../../../../common/investigations/types';
import { ICONS } from '../../../icons';
import { formatAbsoluteUtc } from '../../shared/formatters';
import { SeenElsewhereList } from '../seen_elsewhere';
import { useSeenElsewhere } from '../use_evidence_queries';
import { DataTable, DetailSection, DocumentFields, PairsList } from './primitives';
import type { DocumentView } from './primitives';
import * as i18n from '../translations';

type SeverityColor = 'default' | 'warning' | 'danger';

const severityColor = (severity: string): SeverityColor => {
  const value = severity.toLowerCase();
  if (value === 'critical' || value === 'high') return 'danger';
  if (value === 'medium') return 'warning';
  return 'default';
};

const capitalize = (value: string): string =>
  value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;

const Tile: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
      <EuiText
        size="xs"
        color="subdued"
        css={css`
          margin-block-end: ${euiTheme.size.xxs};
        `}
      >
        {title}
      </EuiText>
      <EuiText size="s">
        <strong>{children}</strong>
      </EuiText>
    </EuiPanel>
  );
};
Tile.displayName = 'Tile';

const Code: React.FC<{ children: string; language?: string }> = ({
  children,
  language = 'text',
}) => (
  <EuiCodeBlock language={language} fontSize="s" paddingSize="m" isCopyable overflowHeight={260}>
    {children}
  </EuiCodeBlock>
);
Code.displayName = 'Code';

const IndicatorSightings: React.FC<{ recordId: string; value: string }> = ({ recordId, value }) => {
  const { data } = useSeenElsewhere(recordId, [value]);
  const info = data?.values[value.toLowerCase()];
  return (
    <DetailSection
      title={i18n.DETAIL_SEEN_ELSEWHERE}
      data-test-subj="investigationEvidenceDetailSeenElsewhere"
    >
      {info && info.count > 0 ? (
        <>
          <EuiText size="s">{i18n.SEEN_IN_OTHER(info.count)}</EuiText>
          <EuiSpacer size="xs" />
          <SeenElsewhereList info={info} />
        </>
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.SEEN_NOWHERE}
        </EuiText>
      )}
    </DetailSection>
  );
};
IndicatorSightings.displayName = 'IndicatorSightings';

type AlertSnapshot = Extract<EvidenceSnapshot, { kind: 'alert' }>;
type IndicatorSnapshot = Extract<EvidenceSnapshot, { kind: 'indicator' }>;

const AlertDetail: React.FC<{
  snapshot: AlertSnapshot;
  evidence: EvidenceItem['evidence'];
  documentView: DocumentView;
  onDocumentViewChange: (view: DocumentView) => void;
}> = ({ snapshot, evidence, documentView, onDocumentViewChange }) => (
  <div data-test-subj="investigationEvidenceDetail-alert">
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      {snapshot.severity ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color={severityColor(snapshot.severity)}>
            {capitalize(snapshot.severity)}
          </EuiBadge>
        </EuiFlexItem>
      ) : null}
      {snapshot.timestamp ? (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {formatAbsoluteUtc(snapshot.timestamp)}
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <EuiText size="s">
      <h3>{snapshot.rule}</h3>
    </EuiText>
    <EuiSpacer size="m" />
    <EuiFlexGroup gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <Tile title={i18n.DETAIL_RISK_SCORE}>{snapshot.risk_score}</Tile>
      </EuiFlexItem>
      {evidence.alert?.host ? (
        <EuiFlexItem>
          <Tile title={i18n.DETAIL_HOST}>{evidence.alert.host}</Tile>
        </EuiFlexItem>
      ) : null}
      {evidence.alert?.user ? (
        <EuiFlexItem>
          <Tile title={i18n.DETAIL_USER}>{evidence.alert.user}</Tile>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
    <EuiSpacer size="l" />
    {snapshot.description || snapshot.reason ? (
      <DetailSection title={i18n.DETAIL_ABOUT}>
        {snapshot.description ? (
          <>
            <EuiText size="xs" color="subdued">
              {i18n.DETAIL_RULE_DESCRIPTION}
            </EuiText>
            <EuiText size="s">{snapshot.description}</EuiText>
            <EuiSpacer size="s" />
          </>
        ) : null}
        {snapshot.reason ? (
          <>
            <EuiText size="xs" color="subdued">
              {i18n.DETAIL_ALERT_REASON}
            </EuiText>
            <EuiText size="s">{snapshot.reason}</EuiText>
          </>
        ) : null}
      </DetailSection>
    ) : null}
    {snapshot.mitre.length > 0 ? (
      <DetailSection title={i18n.DETAIL_THREAT_MAPPING}>
        <PairsList pairs={snapshot.mitre} data-test-subj="investigationEvidenceDetailMitre" />
      </DetailSection>
    ) : null}
    <DocumentFields
      title={i18n.DETAIL_HIGHLIGHTED_FIELDS}
      pairs={snapshot.fields}
      view={documentView}
      onViewChange={onDocumentViewChange}
    />
  </div>
);
AlertDetail.displayName = 'AlertDetail';

const IndicatorDetail: React.FC<{
  snapshot: IndicatorSnapshot;
  evidence: EvidenceItem['evidence'];
  recordId: string;
}> = ({ snapshot, evidence, recordId }) => (
  <div data-test-subj="investigationEvidenceDetail-indicator">
    {evidence.indicator ? (
      <>
        <EuiBadge color="hollow">{INDICATOR_TYPE_LABELS[evidence.indicator.type]}</EuiBadge>
        <EuiSpacer size="s" />
        <Code>{evidence.indicator.value}</Code>
        <EuiSpacer size="l" />
      </>
    ) : null}
    <DetailSection title={i18n.DETAIL_FACTS}>
      <PairsList pairs={snapshot.facts} />
    </DetailSection>
    <DetailSection title={i18n.DETAIL_THREAT_INTEL}>
      {snapshot.intel.length > 0 ? (
        <PairsList pairs={snapshot.intel} />
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.DETAIL_NO_INTEL}
        </EuiText>
      )}
    </DetailSection>
    <DetailSection title={i18n.DETAIL_SIGHTINGS}>
      {snapshot.seen.length > 0 ? (
        <PairsList pairs={snapshot.seen} />
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.DETAIL_NOT_OBSERVED}
        </EuiText>
      )}
    </DetailSection>
    {evidence.indicator ? (
      <IndicatorSightings recordId={recordId} value={evidence.indicator.value} />
    ) : null}
  </div>
);
IndicatorDetail.displayName = 'IndicatorDetail';

export interface DetailBodyProps {
  item: EvidenceItem;
  recordId: string;
  documentView: DocumentView;
  onDocumentViewChange: (view: DocumentView) => void;
}

/** Renders the preserved snapshot of an evidence item by kind. */
export const DetailBody: React.FC<DetailBodyProps> = ({
  item,
  recordId,
  documentView,
  onDocumentViewChange,
}) => {
  const { evidence } = item;
  const { snapshot } = evidence;

  if (!snapshot) {
    return (
      <NoSnapshot
        item={item}
        documentView={documentView}
        onDocumentViewChange={onDocumentViewChange}
      />
    );
  }

  switch (snapshot.kind) {
    case 'alert':
      return (
        <AlertDetail
          snapshot={snapshot}
          evidence={evidence}
          documentView={documentView}
          onDocumentViewChange={onDocumentViewChange}
        />
      );
    case 'event':
      return (
        <div data-test-subj="investigationEvidenceDetail-event">
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{snapshot.category}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {formatAbsoluteUtc(snapshot.timestamp)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <DocumentFields
            title={i18n.DETAIL_DOCUMENT}
            pairs={snapshot.fields}
            view={documentView}
            onViewChange={onDocumentViewChange}
          />
        </div>
      );
    case 'entity':
      return (
        <div data-test-subj="investigationEvidenceDetail-entity">
          <DetailSection title={i18n.DETAIL_ENTITY_RECORD}>
            <PairsList pairs={snapshot.attributes} />
          </DetailSection>
          {snapshot.contributions && snapshot.contributions.length > 0 ? (
            <DetailSection title={i18n.DETAIL_RISK_CONTRIBUTIONS}>
              <PairsList pairs={snapshot.contributions} />
            </DetailSection>
          ) : null}
        </div>
      );
    case 'indicator':
      return <IndicatorDetail snapshot={snapshot} evidence={evidence} recordId={recordId} />;
    case 'query':
      return (
        <div data-test-subj="investigationEvidenceDetail-query">
          <DetailSection title={i18n.DETAIL_QUERY}>
            <Code language="sql">{snapshot.query}</Code>
          </DetailSection>
          <DetailSection
            title={i18n.DETAIL_RESULTS}
            actions={
              <EuiText size="xs" color="subdued">
                {snapshot.meta}
              </EuiText>
            }
          >
            {snapshot.note ? (
              <>
                <EuiCallOut announceOnMount size="s" iconType={ICONS.info} title={snapshot.note} />
                <EuiSpacer size="s" />
              </>
            ) : null}
            <DataTable
              caption={i18n.DETAIL_RESULTS}
              columns={snapshot.columns}
              rows={snapshot.rows}
              data-test-subj="investigationEvidenceDetailResults"
            />
          </DetailSection>
        </div>
      );
    case 'finding':
      return (
        <div data-test-subj="investigationEvidenceDetail-finding">
          <DetailSection title={i18n.DETAIL_FINDING}>
            <EuiText size="s">{snapshot.text}</EuiText>
          </DetailSection>
          <DetailSection title={i18n.DETAIL_CHECKED}>
            <DataTable
              caption={i18n.DETAIL_CHECKED}
              columns={[i18n.DETAIL_SYSTEM, i18n.DETAIL_CHECK, i18n.DETAIL_RESULT]}
              rows={snapshot.steps}
              data-test-subj="investigationEvidenceDetailSteps"
            />
          </DetailSection>
        </div>
      );
    case 'file':
      return (
        <div data-test-subj="investigationEvidenceDetail-file">
          <DetailSection title={i18n.DETAIL_FILE}>
            <PairsList
              pairs={[
                [i18n.DETAIL_FILE_NAME, snapshot.name],
                [i18n.DETAIL_FILE_SIZE, snapshot.size],
                ...(snapshot.mime_type
                  ? ([[i18n.DETAIL_FILE_TYPE, snapshot.mime_type]] as Array<[string, string]>)
                  : []),
                [i18n.DETAIL_FILE_SHA256, snapshot.sha256],
              ]}
              data-test-subj="investigationEvidenceDetailFile"
            />
          </DetailSection>
        </div>
      );
    case 'note':
      return (
        <div data-test-subj="investigationEvidenceDetail-note">
          <DetailSection title={i18n.DETAIL_NOTE}>
            <EuiMarkdownFormat textSize="s">{snapshot.text}</EuiMarkdownFormat>
          </DetailSection>
        </div>
      );
    case 'saved_search':
      return (
        <div data-test-subj="investigationEvidenceDetail-saved_search">
          <DetailSection title={snapshot.name}>
            <EuiText size="s" color="subdued">
              {snapshot.summary}
            </EuiText>
            <EuiSpacer size="s" />
            <EuiCallOut
              size="s"
              iconType={ICONS.preserved}
              title={i18n.DETAIL_SAVED_SEARCH_PRESERVED}
            />
          </DetailSection>
          {snapshot.columns.length > 0 || snapshot.rows.length > 0 ? (
            <DetailSection title={i18n.DETAIL_RESULTS_PREVIEW}>
              <DataTable
                caption={i18n.DETAIL_RESULTS_PREVIEW}
                columns={snapshot.columns}
                rows={snapshot.rows}
                data-test-subj="investigationEvidenceDetailResults"
              />
            </DetailSection>
          ) : null}
        </div>
      );
    case 'visualization':
      return (
        <div data-test-subj="investigationEvidenceDetail-visualization">
          <DetailSection title={snapshot.name}>
            <PairsList
              pairs={[
                [i18n.DETAIL_VISUALIZATION_APP, snapshot.app],
                ...(snapshot.description
                  ? ([[i18n.DESCRIPTION_LABEL, snapshot.description]] as Array<[string, string]>)
                  : []),
              ]}
            />
          </DetailSection>
        </div>
      );
    case 'conversation':
      return (
        <div data-test-subj="investigationEvidenceDetail-conversation">
          <DetailSection title={i18n.DETAIL_IN_CONVERSATION}>
            <EuiText size="xs" color="subdued">
              {snapshot.author}
            </EuiText>
            <EuiMarkdownFormat textSize="s">{snapshot.message}</EuiMarkdownFormat>
          </DetailSection>
        </div>
      );
    default:
      return null;
  }
};
DetailBody.displayName = 'DetailBody';

/** Items without a snapshot show what the evidence record itself holds. */
const NoSnapshot: React.FC<{
  item: EvidenceItem;
  documentView: DocumentView;
  onDocumentViewChange: (view: DocumentView) => void;
}> = ({ item, documentView, onDocumentViewChange }) => {
  const { evidence } = item;
  const pairs: Array<[string, string]> = [];
  if (evidence.alert) {
    const { alert } = evidence;
    pairs.push(
      ['kibana.alert.rule.name', alert.rule_name ?? ''],
      ['_id', alert.id],
      ['_index', alert.index]
    );
    if (alert.severity) pairs.push(['kibana.alert.severity', alert.severity]);
    if (alert.risk_score !== null && alert.risk_score !== undefined) {
      pairs.push(['kibana.alert.risk_score', String(alert.risk_score)]);
    }
    if (alert.host) pairs.push(['host.name', alert.host]);
    if (alert.user) pairs.push(['user.name', alert.user]);
    if (alert.timestamp) pairs.push(['@timestamp', alert.timestamp]);
  }

  return (
    <div data-test-subj="investigationEvidenceDetail-none">
      {evidence.indicator ? (
        <>
          <EuiBadge color="hollow">{INDICATOR_TYPE_LABELS[evidence.indicator.type]}</EuiBadge>
          <EuiSpacer size="s" />
          <Code>{evidence.indicator.value}</Code>
          <EuiSpacer size="l" />
        </>
      ) : null}
      {item.text ? (
        <DetailSection title={i18n.DETAIL_NOTE}>
          <EuiMarkdownFormat textSize="s">{item.text}</EuiMarkdownFormat>
        </DetailSection>
      ) : null}
      {pairs.length > 0 ? (
        <DocumentFields
          title={i18n.DETAIL_DOCUMENT}
          pairs={pairs}
          view={documentView}
          onViewChange={onDocumentViewChange}
        />
      ) : null}
      {!evidence.indicator && !item.text && pairs.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.DETAIL_NO_PRESERVED}
        </EuiText>
      ) : null}
      {evidence.indicator ? (
        <IndicatorSightings recordId={item.record_id} value={evidence.indicator.value} />
      ) : null}
    </div>
  );
};
NoSnapshot.displayName = 'NoSnapshot';
