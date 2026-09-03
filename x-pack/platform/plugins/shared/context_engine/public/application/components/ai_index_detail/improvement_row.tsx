/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { Improvement } from '../../../../common/http_api/improvements';
import { isOpenImprovement } from '../../../../common/http_api/improvements';
import {
  getActionLabel,
  getProposedChangeFields,
  getProvenanceSummary,
  getReversibilityNote,
  getStatusColor,
  getStatusLabel,
  truncate,
} from './improvement_format';

interface ImprovementRowProps {
  improvement: Improvement;
  /** Absent when Agent Builder is unavailable, which hides "Talk with agent". */
  onTalkWithAgent?: (improvement: Improvement) => void;
  onApprove: (improvement: Improvement) => void;
  onReject: (improvement: Improvement) => void;
  isApproving: boolean;
  isRejecting: boolean;
  /** Decisions are unavailable to a reader, who still sees everything the row shows. */
  canDecide: boolean;
  /** Drills from the improvement to the signals it came from. */
  onViewProvenance?: (improvement: Improvement) => void;
}

/** A field of the proposed change, clamped with a show-more toggle for the long ones. */
const ChangeField = ({
  label,
  value,
  isCode,
}: {
  label: string;
  value: string;
  isCode?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { text, isTruncated } = truncate(value);
  const shown = isExpanded ? value : text;

  return (
    <>
      <EuiText size="xs">
        <strong>{label}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      {isCode ? (
        <EuiCodeBlock language="yaml" paddingSize="s" fontSize="s" isCopyable>
          {shown}
        </EuiCodeBlock>
      ) : (
        <EuiText size="s">
          <p>{shown}</p>
        </EuiText>
      )}
      {isTruncated && (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={() => setIsExpanded(!isExpanded)}
          data-test-subj="contextImprovementShowMore"
        >
          {isExpanded
            ? i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.showLess', {
                defaultMessage: 'Show less',
              })
            : i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.showMore', {
                defaultMessage: 'Show more',
              })}
        </EuiButtonEmpty>
      )}
      <EuiSpacer size="s" />
    </>
  );
};

/**
 * One suggested improvement: what it would change, why, where the evidence came from, and the two
 * decisions plus the escape hatch into a conversation about it.
 */
export const ImprovementRow = ({
  improvement,
  onTalkWithAgent,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
  canDecide,
  onViewProvenance,
}: ImprovementRowProps) => {
  const [isRationaleExpanded, setIsRationaleExpanded] = useState(false);
  const { text: rationale, isTruncated: isRationaleTruncated } = truncate(improvement.rationale);
  const isOpen = isOpenImprovement(improvement.status);
  const reversibility = getReversibilityNote(improvement.action);
  const isBusy = isApproving || isRejecting;

  return (
    <EuiPanel hasBorder paddingSize="m" role="listitem" data-test-subj="contextImprovementRow">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{improvement.title}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="contextImprovementAction">
                {getActionLabel(improvement.action)}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge
                color={getStatusColor(improvement.status)}
                data-test-subj="contextImprovementStatus"
              >
                {getStatusLabel(improvement.status)}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiText size="s" data-test-subj="contextImprovementRationale">
        <p>{isRationaleExpanded ? improvement.rationale : rationale}</p>
      </EuiText>
      {isRationaleTruncated && (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={() => setIsRationaleExpanded(!isRationaleExpanded)}
          data-test-subj="contextImprovementRationaleShowMore"
        >
          {isRationaleExpanded
            ? i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.showLess', {
                defaultMessage: 'Show less',
              })
            : i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.showMore', {
                defaultMessage: 'Show more',
              })}
        </EuiButtonEmpty>
      )}

      <EuiSpacer size="m" />

      <div data-test-subj="contextImprovementChange">
        {getProposedChangeFields(improvement).map((field) => (
          <ChangeField key={field.label} {...field} />
        ))}
      </div>

      {reversibility && (
        <>
          <EuiText size="xs" color="subdued" data-test-subj="contextImprovementReversible">
            <p>{reversibility}</p>
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}

      {improvement.status === 'failed' && improvement.resolution?.error && (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="danger"
            iconType="alert"
            data-test-subj="contextImprovementError"
            title={i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.failedTitle', {
              defaultMessage: 'Applying this failed. Nothing was changed.',
            })}
          >
            <p>{improvement.resolution.error}</p>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}

      {improvement.status === 'rejected' && improvement.resolution?.reason && (
        <>
          <EuiText size="xs" color="subdued" data-test-subj="contextImprovementRejectReason">
            <p>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.rejectedBecause', {
                defaultMessage: 'Rejected because: {reason}',
                values: { reason: improvement.resolution.reason },
              })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}

      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued" data-test-subj="contextImprovementProvenance">
            <p>{getProvenanceSummary(improvement)}</p>
          </EuiText>
        </EuiFlexItem>
        {onViewProvenance && improvement.provenance.tags?.length ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="inspect"
              onClick={() => onViewProvenance(improvement)}
              data-test-subj="contextImprovementViewSignalsButton"
            >
              {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.viewSignalsButton', {
                defaultMessage: 'View signals',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>

      {isOpen && canDecide && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
            {onTalkWithAgent && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="sparkles"
                  onClick={() => onTalkWithAgent(improvement)}
                  data-test-subj="contextImprovementTalkButton"
                >
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.talkButton', {
                    defaultMessage: 'Talk with agent',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                color="danger"
                onClick={() => onReject(improvement)}
                isLoading={isRejecting}
                isDisabled={isBusy}
                data-test-subj="contextImprovementRejectButton"
              >
                {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.rejectButton', {
                  defaultMessage: 'Reject',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                onClick={() => onApprove(improvement)}
                isLoading={isApproving}
                isDisabled={isBusy}
                data-test-subj="contextImprovementApproveButton"
              >
                {improvement.status === 'failed'
                  ? i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.retryButton', {
                      defaultMessage: 'Retry',
                    })
                  : i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.approveButton', {
                      defaultMessage: 'Approve',
                    })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};
