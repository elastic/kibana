/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  getSeverityLabel,
  type SignificantEventStatus,
  type SignificantEventUpdate,
} from '@kbn/significant-events-schema';
import { EvidenceList, type EvidenceListProps } from './evidence_list';

const FIELD_LABELS: Record<SignificantEventUpdate['field'], string> = {
  severity: i18n.translate('xpack.investigationOutput.update.field.severity', {
    defaultMessage: 'Severity',
  }),
  summary: i18n.translate('xpack.investigationOutput.update.field.summary', {
    defaultMessage: 'Summary',
  }),
  status: i18n.translate('xpack.investigationOutput.update.field.status', {
    defaultMessage: 'Status',
  }),
};

const STATUS_LABELS: Record<SignificantEventStatus, string> = {
  open: i18n.translate('xpack.investigationOutput.update.status.open', { defaultMessage: 'Open' }),
  closed: i18n.translate('xpack.investigationOutput.update.status.closed', {
    defaultMessage: 'Closed',
  }),
  dismissed: i18n.translate('xpack.investigationOutput.update.status.dismissed', {
    defaultMessage: 'Dismissed',
  }),
};

/**
 * Old/new values as a badge transition, typed per field. Returns `null` for the `summary` field
 * (long free text, rendered as stacked blocks instead of badges).
 */
const badgeLabels = (update: SignificantEventUpdate): { from: string; to: string } | null => {
  switch (update.field) {
    case 'severity':
      return { from: getSeverityLabel(update.from), to: getSeverityLabel(update.to) };
    case 'status':
      return { from: STATUS_LABELS[update.from], to: STATUS_LABELS[update.to] };
    default:
      return null;
  }
};

const SignificantEventUpdateRow: React.FC<{
  update: SignificantEventUpdate;
  getQueryHref?: EvidenceListProps['getQueryHref'];
}> = ({ update, getQueryHref }) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationSignificantEventUpdateEvidence' });
  const { field, from, to, reason, evidence } = update;
  const badges = badgeLabels(update);

  return (
    <EuiFlexItem grow={false} data-test-subj={`investigationSignificantEventUpdate-${field}`}>
      <EuiText size="xs" color="text">
        <strong>{FIELD_LABELS[field]}</strong>
      </EuiText>
      <EuiSpacer size="xs" />

      {badges ? (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{badges.from}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {/* Decorative: the from/to transition is already conveyed by the two badges' text. */}
            <EuiIcon type="sortRight" size="s" color="subdued" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="accent">{badges.to}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate('xpack.investigationOutput.update.summaryFrom', {
              defaultMessage: 'From: {from}',
              values: { from },
            })}
          </p>
          <p>
            {i18n.translate('xpack.investigationOutput.update.summaryTo', {
              defaultMessage: 'To: {to}',
              values: { to },
            })}
          </p>
        </EuiText>
      )}

      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {reason}
      </EuiText>

      <EuiSpacer size="xs" />
      <EuiAccordion
        id={accordionId}
        paddingSize="none"
        buttonContent={
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.investigationOutput.update.evidenceLabel', {
              defaultMessage: 'Evidence ({count})',
              values: { count: evidence.length },
            })}
          </EuiText>
        }
      >
        <EvidenceList evidence={evidence} getQueryHref={getQueryHref} />
      </EuiAccordion>
    </EuiFlexItem>
  );
};

/**
 * Read-only display of the field changes an investigation proposed for the significant event
 * (`significant_event_updates` in the investigation state). Intentionally minimal — the caller
 * decides when to render it (e.g. only once the investigation is complete).
 */
export const SignificantEventUpdates: React.FC<{
  updates: SignificantEventUpdate[];
  getQueryHref?: EvidenceListProps['getQueryHref'];
}> = ({ updates, getQueryHref }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasShadow={false}
      color="subdued"
      paddingSize="m"
      data-test-subj="investigationSignificantEventUpdates"
      css={css`
        margin: ${euiTheme.size.base};
      `}
    >
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.investigationOutput.update.title', {
            defaultMessage: 'Significant event updates',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="m">
        {updates.map((update, index) => (
          <SignificantEventUpdateRow
            key={`${update.field}-${index}`}
            update={update}
            getQueryHref={getQueryHref}
          />
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
