/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import React from 'react';
import type { ImprovementEnvelope } from '../../../../common/http_api/improvements';
import { ExpandableText } from '../expandable_text';
import { humanizeTagType } from './signal_format';
import {
  actionBadgeColor,
  actionLabel,
  isOpen,
  statusBadgeColor,
  statusLabel,
  targetLabel,
} from './improvement_format';

interface ImprovementRowProps {
  improvement: ImprovementEnvelope;
  /** False while another suggestion is being resolved, so two approvals cannot race. */
  isActionable: boolean;
  /** Which of this row's own actions is in flight, if any. */
  resolvingAction?: 'approve' | 'reject';
  onApprove: () => void;
  onReject: () => void;
}

const kiFieldLabels = {
  type: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.ki.type', {
    defaultMessage: 'Type',
  }),
  title: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.ki.title', {
    defaultMessage: 'Title',
  }),
  description: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.ki.description', {
    defaultMessage: 'Description',
  }),
  content: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.ki.content', {
    defaultMessage: 'Content',
  }),
  tags: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.ki.tags', {
    defaultMessage: 'Tags',
  }),
} as const;

/**
 * One improvement suggestion: what it would change, why the agent proposed it, and the exact
 * payload it would write. A reviewer approves or rejects on this alone, so the rationale and the
 * payload are both on the card rather than behind a flyout.
 */
export const ImprovementRow = ({
  improvement,
  isActionable,
  resolvingAction,
  onApprove,
  onReject,
}: ImprovementRowProps) => {
  const {
    action,
    status,
    title,
    rationale,
    payload,
    confidence,
    signal_tags: signalTags,
  } = improvement;
  const target = targetLabel(improvement);
  const open = isOpen(status);

  const kiEntries = payload.ki
    ? (Object.entries(kiFieldLabels) as Array<[keyof typeof kiFieldLabels, string]>)
        .map(([field, label]) => {
          const value = payload.ki?.[field];
          if (value === undefined || (Array.isArray(value) && value.length === 0)) {
            return undefined;
          }
          return {
            title: label,
            description: <ExpandableText text={Array.isArray(value) ? value.join(', ') : value} />,
          };
        })
        .filter(
          (entry): entry is { title: string; description: React.ReactElement } =>
            entry !== undefined
        )
    : [];

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="contextImprovementRow">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4 data-test-subj="contextImprovementRowTitle">{title}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={actionBadgeColor(action)} data-test-subj="contextImprovementRowAction">
            {actionLabel(action)}
          </EuiBadge>
        </EuiFlexItem>
        {!open && (
          <EuiFlexItem grow={false}>
            <EuiBadge color={statusBadgeColor(status)} data-test-subj="contextImprovementRowStatus">
              {statusLabel(status)}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="xs" />

      <EuiText size="s" color="subdued" data-test-subj="contextImprovementRowRationale">
        <p>
          <ExpandableText text={rationale} />
        </p>
      </EuiText>

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="xs" responsive={false} wrap alignItems="center">
        {target && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="contextImprovementRowTarget">
              {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.targetChip', {
                defaultMessage: 'Targets {target}',
                values: { target },
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
        {(signalTags ?? []).map((tag) => (
          <EuiFlexItem grow={false} key={tag}>
            <EuiBadge color="hollow" data-test-subj="contextImprovementRowSignalTag">
              {humanizeTagType(tag)}
            </EuiBadge>
          </EuiFlexItem>
        ))}
        {confidence !== undefined && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="contextImprovementRowConfidence">
              {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.confidenceChip', {
                defaultMessage: '{percent}% confidence',
                values: { percent: Math.round(confidence * 100) },
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" data-test-subj="contextImprovementRowSuggestedAt">
            <FormattedRelative value={improvement.suggested_at} />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      {(kiEntries.length > 0 || payload.workflow_yaml) && (
        <>
          <EuiSpacer size="s" />
          <EuiAccordion
            id={`contextImprovementPayload-${improvement.improvement_id}`}
            buttonContent={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.improvements.payloadToggle',
              { defaultMessage: 'What would change' }
            )}
            paddingSize="s"
            data-test-subj="contextImprovementRowPayload"
          >
            {kiEntries.length > 0 && (
              <EuiDescriptionList
                compressed
                type="column"
                listItems={kiEntries}
                data-test-subj="contextImprovementRowKiPayload"
              />
            )}
            {payload.workflow_yaml && (
              <EuiCodeBlock
                language="yaml"
                paddingSize="m"
                overflowHeight={300}
                isCopyable
                data-test-subj="contextImprovementRowWorkflowYaml"
              >
                {payload.workflow_yaml}
              </EuiCodeBlock>
            )}
          </EuiAccordion>
        </>
      )}

      {status === 'failed' && improvement.resolution?.error && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            size="s"
            color="danger"
            iconType="alert"
            data-test-subj="contextImprovementRowError"
            title={i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.failedTitle', {
              defaultMessage: 'Applying this suggestion failed',
            })}
          >
            <p>
              <ExpandableText text={improvement.resolution.error} />
            </p>
          </EuiCallOut>
        </>
      )}

      {open ? (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                color="danger"
                onClick={onReject}
                isDisabled={!isActionable}
                isLoading={resolvingAction === 'reject'}
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
                onClick={onApprove}
                isDisabled={!isActionable}
                isLoading={resolvingAction === 'approve'}
                data-test-subj="contextImprovementApproveButton"
              >
                {status === 'failed'
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
      ) : (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued" data-test-subj="contextImprovementRowResolution">
            <p>
              {status === 'applied'
                ? i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.appliedBy', {
                    defaultMessage: 'Applied by {user}',
                    values: {
                      user:
                        improvement.resolution?.by ??
                        i18n.translate(
                          'xpack.contextEngine.aiIndexDetail.improvements.unknownUser',
                          { defaultMessage: 'an unknown user' }
                        ),
                    },
                  })
                : i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.rejectedBy', {
                    defaultMessage: 'Rejected by {user}',
                    values: {
                      user:
                        improvement.resolution?.by ??
                        i18n.translate(
                          'xpack.contextEngine.aiIndexDetail.improvements.unknownUser',
                          { defaultMessage: 'an unknown user' }
                        ),
                    },
                  })}{' '}
              <FormattedRelative
                value={
                  improvement.applied_at ?? improvement.rejected_at ?? improvement.suggested_at
                }
              />
            </p>
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
};
