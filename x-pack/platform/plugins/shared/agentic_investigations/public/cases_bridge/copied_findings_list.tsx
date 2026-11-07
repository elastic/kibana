/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { CommonAttachmentListViewProps } from '@kbn/cases-plugin/public';
import {
  HYPOTHESES_CASE_ATTACHMENT_TYPE,
  IMPACT_CASE_ATTACHMENT_TYPE,
  type HypothesesCaseAttachmentData,
  type ImpactCaseAttachmentData,
} from '../../common/cases_bridge';
import { EVIDENCE } from './translations';

const dataOf = <T,>(caseData: CommonAttachmentListViewProps['caseData'], type: string): T[] =>
  caseData.comments.flatMap((comment) => {
    const attachment = comment as { type?: string; data?: unknown };
    return attachment.type === type && attachment.data ? [attachment.data as T] : [];
  });

const matches = (searchTerm: string | undefined, ...texts: Array<string | undefined>) =>
  !searchTerm ||
  texts.some((text) => text?.toLowerCase().includes(searchTerm.trim().toLowerCase()));

const Source: React.FC<{ title?: string }> = ({ title }) => (
  <EuiText size="xs" color="subdued">
    {title ? EVIDENCE.fromInvestigationCopied(title) : EVIDENCE.copiedNote}
  </EuiText>
);

/** The investigations' impact, as copied onto the case. */
export const ImpactList: React.FC<CommonAttachmentListViewProps> = ({ caseData, searchTerm }) => {
  const items = dataOf<ImpactCaseAttachmentData>(caseData, IMPACT_CASE_ATTACHMENT_TYPE).filter(
    (item) =>
      matches(
        searchTerm,
        item.summary,
        item.investigation_title,
        ...item.entities.map(({ name, id }) => name ?? id)
      )
  );
  return (
    <div data-test-subj="case-view-copied-impact">
      {items.map((item, index) => (
        <React.Fragment key={item.investigation_id}>
          {index > 0 && <EuiHorizontalRule margin="s" />}
          {item.summary && (
            <EuiText size="s">
              <p>{item.summary}</p>
            </EuiText>
          )}
          {item.entities.length > 0 && (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {item.entities.map((entity) => (
                <EuiFlexItem grow={false} key={entity.id}>
                  <EuiBadge color="hollow">
                    {entity.type
                      ? EVIDENCE.typedEntity(entity.type, entity.name ?? entity.id)
                      : entity.name ?? entity.id}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
          <EuiSpacer size="xs" />
          <Source title={item.investigation_title} />
        </React.Fragment>
      ))}
    </div>
  );
};

const STATUS_BADGE: Record<
  HypothesesCaseAttachmentData['hypotheses'][number]['status'],
  { color: string; label: string }
> = {
  confirmed: { color: 'success', label: EVIDENCE.statusSupported },
  dismissed: { color: 'danger', label: EVIDENCE.statusRefuted },
  investigating: { color: 'hollow', label: EVIDENCE.statusOpen },
};

/** The investigations' hypotheses, as copied onto the case. */
export const HypothesesList: React.FC<CommonAttachmentListViewProps> = ({
  caseData,
  searchTerm,
}) => {
  const items = dataOf<HypothesesCaseAttachmentData>(caseData, HYPOTHESES_CASE_ATTACHMENT_TYPE)
    .map((item) => ({
      ...item,
      hypotheses: item.hypotheses.filter((hypothesis) =>
        matches(searchTerm, hypothesis.candidate, hypothesis.reason)
      ),
    }))
    .filter((item) => item.hypotheses.length > 0);
  return (
    <div data-test-subj="case-view-copied-hypotheses">
      {items.map((item, index) => (
        <React.Fragment key={item.investigation_id}>
          {index > 0 && <EuiHorizontalRule margin="s" />}
          {item.hypotheses.map((hypothesis, position) => (
            <EuiFlexGroup
              key={position}
              gutterSize="s"
              alignItems="baseline"
              responsive={false}
              data-test-subj="case-view-copied-hypothesis"
            >
              <EuiFlexItem grow={false}>
                <EuiBadge color={STATUS_BADGE[hypothesis.status].color}>
                  {STATUS_BADGE[hypothesis.status].label}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <p>{hypothesis.candidate}</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
          <EuiSpacer size="xs" />
          <Source title={item.investigation_title} />
        </React.Fragment>
      ))}
    </div>
  );
};
