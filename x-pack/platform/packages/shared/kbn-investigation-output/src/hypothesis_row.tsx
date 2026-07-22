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
  EuiLoadingSpinner,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { InvestigationHypothesis } from '@kbn/significant-events-schema';

const HYPOTHESIS_STATUS_ICON: Record<InvestigationHypothesis['status'], string> = {
  investigating: 'clock',
  dismissed: 'dashedCircle',
  confirmed: 'checkCircle',
};

export const HypothesisRow: React.FC<{ hypothesis: InvestigationHypothesis }> = ({
  hypothesis,
}) => {
  const { candidate, confidence, status, reason } = hypothesis;
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationHypothesis' });

  return (
    <EuiAccordion
      id={accordionId}
      data-test-subj="investigationOutputHypothesis"
      paddingSize="s"
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            {status === 'investigating' ? (
              <EuiLoadingSpinner size="s" />
            ) : (
              <EuiIcon
                type={HYPOTHESIS_STATUS_ICON[status]}
                color="text"
                data-test-subj={`investigationOutputHypothesisStatus-${status}`}
                aria-hidden={true}
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiText size="xs" color="text">
              <strong>
                {i18n.translate('xpack.investigationOutput.hypothesis', {
                  defaultMessage: 'Hypothesis:',
                })}
              </strong>{' '}
              <span>{candidate}</span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={
        <EuiBadge
          color={status === 'confirmed' ? 'success' : 'hollow'}
          data-test-subj="investigationOutputConfidenceBadge"
        >
          <FormattedMessage
            id="xpack.investigationOutput.hypothesisConfidenceBadgeLabel"
            defaultMessage="{confidence, number, percent}"
            values={{ confidence }}
          />
        </EuiBadge>
      }
    >
      <EuiText size="xs" color="subdued">
        <p>
          {reason ??
            i18n.translate('xpack.investigationOutput.noReasonRecordedDescription', {
              defaultMessage: 'No reasoning recorded yet.',
            })}
        </p>
      </EuiText>
    </EuiAccordion>
  );
};
