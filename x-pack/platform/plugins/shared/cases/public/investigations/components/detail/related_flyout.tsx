/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiCallOut,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { VERDICT_LABELS } from '../../../../common/investigations/types';
import type { RelatedRecord } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { ActorBadge } from '../shared/actor_badge';
import { formatAbsoluteUtc } from '../shared/formatters';
import { RelativeTime } from '../shared/relative_time';
import { StatusBadge } from '../shared/status_badge';
import { getReasonLabels } from './related_reasons';
import * as i18n from './translations';

export interface RelatedFlyoutProps {
  related: RelatedRecord;
  /** Display id of the investigation being viewed. */
  currentDisplayId: string;
  onClose: () => void;
  onOpenInvestigation: (recordId: string) => void;
}

/** Details of a related investigation: who, when, why it is related, outcome and summary. */
export const RelatedFlyout: React.FC<RelatedFlyoutProps> = ({
  related,
  currentDisplayId,
  onClose,
  onOpenInvestigation,
}) => {
  const titleId = useGeneratedHtmlId();
  const { record, shared_values: sharedValues } = related;
  const reasons = getReasonLabels(related);

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      ownFocus
      aria-labelledby={titleId}
      data-test-subj="investigationRelatedFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{record.display_id}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StatusBadge status={record.status} owner={record.owner} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTitle size="s">
          <h2 id={titleId}>{record.title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiDescriptionList
          type="column"
          compressed
          columnWidths={[1, 2]}
          listItems={[
            {
              title: i18n.FLYOUT_ASSIGNEES,
              description: record.owner ? (
                <ActorBadge actor={record.owner} compact />
              ) : (
                i18n.UNASSIGNED
              ),
            },
            { title: i18n.FLYOUT_STARTED_BY, description: record.origin.label },
            { title: i18n.FLYOUT_CREATED, description: formatAbsoluteUtc(record.created_at) },
            { title: i18n.FLYOUT_UPDATED, description: <RelativeTime value={record.updated_at} /> },
            { title: i18n.FLYOUT_ALERTS, description: String(record.counters.alerts) },
          ]}
        />
        <EuiSpacer size="l" />
        <EuiTitle size="xxs">
          <h3>{i18n.FLYOUT_WHY_RELATED(currentDisplayId)}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s">
          <ul>
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </EuiText>
        {record.close_outcome ? (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h3>{i18n.FLYOUT_OUTCOME}</h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiCallOut
              announceOnMount
              size="s"
              color="success"
              iconType={ICONS.check}
              title={i18n.FLYOUT_OUTCOME_TEXT(
                VERDICT_LABELS[record.close_outcome.verdict],
                record.close_outcome.reason,
                record.close_outcome.root_cause
              )}
            />
          </>
        ) : null}
        {record.summary ? (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h3>{i18n.FLYOUT_SUMMARY}</h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s">{record.summary}</EuiText>
          </>
        ) : null}
        {sharedValues.length > 0 ? (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h3>{i18n.FLYOUT_SHARED_ENTITIES}</h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {sharedValues.map((value) => (
                <EuiFlexItem key={value} grow={false}>
                  <EuiBadge color="hollow">{value}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        ) : null}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="investigationRelatedFlyoutClose">
              {i18n.FLYOUT_CLOSE}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType={ICONS.external}
              iconSide="right"
              onClick={() => onOpenInvestigation(record.id)}
              data-test-subj="investigationRelatedFlyoutOpen"
            >
              {i18n.FLYOUT_OPEN_INVESTIGATION}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
RelatedFlyout.displayName = 'RelatedFlyout';
