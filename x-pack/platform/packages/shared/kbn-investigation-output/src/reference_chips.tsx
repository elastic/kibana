/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { InvestigationReference } from '@kbn/significant-events-schema';

const REFERENCE_ICON: Record<InvestigationReference['type'], string> = {
  query: 'discoverApp',
  ki: 'tag',
  rule: 'bell',
};

const REFERENCE_TYPE_LABEL: Record<InvestigationReference['type'], string> = {
  query: i18n.translate('xpack.investigationOutput.referenceTypeQueryLabel', {
    defaultMessage: 'ES|QL query',
  }),
  ki: i18n.translate('xpack.investigationOutput.referenceTypeKiLabel', {
    defaultMessage: 'Knowledge indicator',
  }),
  rule: i18n.translate('xpack.investigationOutput.referenceTypeRuleLabel', {
    defaultMessage: 'Rule',
  }),
};

const truncate = (value: string, length = 48): string =>
  value.length > length ? `${value.slice(0, length - 1)}…` : value;

const referenceLabel = (reference: InvestigationReference): string => {
  if (reference.label) return reference.label;
  switch (reference.type) {
    case 'query':
      return truncate(reference.esql ?? REFERENCE_TYPE_LABEL.query);
    case 'ki':
      return reference.ki_name ?? REFERENCE_TYPE_LABEL.ki;
    case 'rule':
      return reference.rule_name ?? REFERENCE_TYPE_LABEL.rule;
  }
};

const referenceTooltip = (reference: InvestigationReference): string => {
  const parts: string[] = [REFERENCE_TYPE_LABEL[reference.type]];
  if (reference.type === 'query' && reference.esql) parts.push(reference.esql);
  if (reference.type === 'ki' && reference.stream_name) parts.push(reference.stream_name);
  if (reference.type === 'rule' && reference.rule_name) parts.push(reference.rule_name);
  return parts.join(' · ');
};

export interface ReferenceChipsProps {
  references: InvestigationReference[];
  /**
   * Optional resolver turning a reference into a link (e.g. a Discover URL for `query`
   * references). References without a href render as plain, informational chips.
   */
  getReferenceHref?: (reference: InvestigationReference) => string | undefined;
}

/**
 * The "references" row of an investigation-trail node: one chip per cited source — the way
 * back from the narrative to the real data (a runnable query, a knowledge indicator, a rule).
 */
export const ReferenceChips: React.FC<ReferenceChipsProps> = ({ references, getReferenceHref }) => {
  if (references.length === 0) return null;

  return (
    <EuiFlexGroup
      gutterSize="xs"
      wrap
      responsive={false}
      data-test-subj="investigationNodeReferences"
    >
      {references.map((reference, index) => {
        const href = getReferenceHref?.(reference);
        const badgeCss = css`
          max-width: 320px;
        `;
        return (
          <EuiFlexItem grow={false} key={index}>
            <EuiToolTip content={referenceTooltip(reference)}>
              {href ? (
                <EuiBadge
                  color="hollow"
                  iconType={REFERENCE_ICON[reference.type]}
                  href={href}
                  target="_blank"
                  css={badgeCss}
                  data-test-subj={`investigationNodeReference-${reference.type}`}
                >
                  {referenceLabel(reference)}
                </EuiBadge>
              ) : (
                <EuiBadge
                  color="hollow"
                  iconType={REFERENCE_ICON[reference.type]}
                  css={badgeCss}
                  data-test-subj={`investigationNodeReference-${reference.type}`}
                >
                  {referenceLabel(reference)}
                </EuiBadge>
              )}
            </EuiToolTip>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
