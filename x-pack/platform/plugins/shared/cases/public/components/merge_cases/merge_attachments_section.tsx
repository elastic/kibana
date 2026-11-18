/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type {
  MergeAttachmentSummary,
  MergeCasesPreviewResponse,
  MergeNotCopiedReason,
  MergePreviewCase,
} from '../../../common/types/api';
import { MergeAttachmentsModal } from './merge_attachments_modal';
import type { MergeChoiceKind, SelectedAttachmentSummary, SelectedAttachments } from './utils';
import * as i18n from './translations';

const ATTACHMENT_KINDS: ReadonlyArray<{
  kind: MergeChoiceKind;
  title: string;
  getOverLimitMessage?: (max: number) => string;
}> = [
  { kind: 'alerts', title: i18n.ALERTS, getOverLimitMessage: i18n.ALERTS_OVER_LIMIT },
  { kind: 'attacks', title: i18n.ATTACKS },
  { kind: 'events', title: i18n.EVENTS },
  {
    kind: 'observables',
    title: i18n.OBSERVABLES,
    getOverLimitMessage: i18n.OBSERVABLES_OVER_LIMIT,
  },
  { kind: 'other', title: i18n.OTHER_ATTACHMENTS, getOverLimitMessage: i18n.OTHER_OVER_LIMIT },
];

const NOT_COPIED_MESSAGES: Record<MergeNotCopiedReason, (count: number) => string> = {
  alertCaseLimit: i18n.NOT_COPIED_ALERT_CASE_LIMIT,
  alertNotAuthorized: i18n.NOT_COPIED_ALERT_NOT_AUTHORIZED,
  license: i18n.NOT_COPIED_LICENSE,
};

const getNotCopiedMessages = (summary: MergeAttachmentSummary): string[] =>
  summary.notCopied
    .filter(({ count }) => count > 0)
    .map(({ reason, count }) => NOT_COPIED_MESSAGES[reason](count));

const getMeta = (summary: SelectedAttachmentSummary, destinationRef?: string): string =>
  [
    i18n.TO_COPY(summary.toCopy),
    summary.excluded > 0 ? i18n.LEFT_OUT(summary.excluded) : null,
    summary.duplicates > 0 ? i18n.DUPLICATES_SKIPPED(summary.duplicates) : null,
    destinationRef != null && summary.existing > 0
      ? i18n.ALREADY_IN_DESTINATION(summary.existing, destinationRef)
      : null,
  ]
    .filter((part): part is string => part != null)
    .join(' · ');

interface MergeAttachmentsSectionProps {
  preview: MergeCasesPreviewResponse;
  /** The preview counts after the user's exclusions. */
  attachments: SelectedAttachments;
  casesById: Map<string, MergePreviewCase>;
  excludedKeys: ReadonlySet<string>;
  onChangeExclusions: (excludedKeys: ReadonlySet<string>) => void;
  /** Set when merging into one of the cases. */
  destinationRef?: string;
  isDisabled: boolean;
}

export const MergeAttachmentsSection = React.memo<MergeAttachmentsSectionProps>(
  ({
    preview,
    attachments,
    casesById,
    excludedKeys,
    onChangeExclusions,
    destinationRef,
    isDisabled,
  }) => {
    const [choosingKind, setChoosingKind] = useState<MergeChoiceKind | 'any' | null>(null);
    const { choices } = preview;
    const presentKinds = ATTACHMENT_KINDS.filter(
      ({ kind }) => attachments[kind].total > 0 || preview.attachments[kind].notCopied.length > 0
    );

    return (
      <>
        {presentKinds.length === 0 ? (
          <EuiText size="s" color="subdued" data-test-subj="merge-cases-no-attachments">
            {i18n.NO_ATTACHMENTS}
          </EuiText>
        ) : (
          <EuiPanel hasBorder paddingSize="none">
            {presentKinds.map(({ kind, title, getOverLimitMessage }) => {
              const summary = attachments[kind];
              const isOverLimit = summary.overBy > 0 && summary.max != null;
              const notCopiedMessages = getNotCopiedMessages(preview.attachments[kind]);

              return (
                <EuiPanel
                  key={kind}
                  hasShadow={false}
                  paddingSize="s"
                  color="transparent"
                  data-test-subj={`merge-cases-attachments-${kind}`}
                >
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <strong>{title}</strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="xs" color="subdued">
                        {getMeta(summary, destinationRef)}
                      </EuiText>
                    </EuiFlexItem>
                    {isOverLimit && summary.max != null ? (
                      <>
                        <EuiFlexItem grow={false}>
                          <EuiBadge
                            color="warning"
                            iconType="warning"
                            data-test-subj={`merge-cases-attachments-${kind}-over-limit`}
                          >
                            {i18n.OVER_LIMIT_BADGE(summary.toCopy + summary.existing, summary.max)}
                          </EuiBadge>
                        </EuiFlexItem>
                        {choices != null ? (
                          <EuiFlexItem grow={false}>
                            <EuiButton
                              size="s"
                              color="warning"
                              onClick={() => setChoosingKind(kind)}
                              isDisabled={isDisabled}
                              aria-label={i18n.CHOOSE_ATTACHMENTS_ARIA_LABEL(title)}
                              data-test-subj={`merge-cases-attachments-${kind}-choose`}
                            >
                              {i18n.CHOOSE_ATTACHMENTS}
                            </EuiButton>
                          </EuiFlexItem>
                        ) : null}
                      </>
                    ) : null}
                  </EuiFlexGroup>
                  {isOverLimit && summary.max != null && getOverLimitMessage != null ? (
                    <>
                      <EuiSpacer size="s" />
                      <KbnWarningCallout
                        announceOnMount={false}
                        size="s"
                        title={getOverLimitMessage(summary.max)}
                        data-test-subj={`merge-cases-attachments-${kind}-over-limit-callout`}
                      />
                    </>
                  ) : null}
                  {notCopiedMessages.map((message) => (
                    <EuiText
                      key={message}
                      size="xs"
                      color="subdued"
                      data-test-subj={`merge-cases-attachments-${kind}-not-copied`}
                    >
                      <EuiIcon type="info" aria-hidden={true} /> {message}
                    </EuiText>
                  ))}
                </EuiPanel>
              );
            })}
          </EuiPanel>
        )}
        {choices != null ? (
          <>
            <EuiSpacer size="s" />
            <EuiButton
              size="s"
              iconType="listBullet"
              onClick={() => setChoosingKind('any')}
              isDisabled={isDisabled}
              data-test-subj="merge-cases-choose-attachments"
            >
              {i18n.CHOOSE_ATTACHMENTS}
            </EuiButton>
          </>
        ) : null}
        {choosingKind != null && choices != null ? (
          <MergeAttachmentsModal
            choices={choices}
            attachments={preview.attachments}
            casesById={casesById}
            excludedKeys={excludedKeys}
            initialKind={choosingKind === 'any' ? undefined : choosingKind}
            onApply={(keys) => {
              onChangeExclusions(keys);
              setChoosingKind(null);
            }}
            onClose={() => setChoosingKind(null)}
          />
        ) : null}
        <EuiSpacer size="s" />
        {attachments.files.total > 0 ? (
          <EuiText size="xs" color="subdued" data-test-subj="merge-cases-files-stay">
            {i18n.FILES_STAY(attachments.files.total)}
          </EuiText>
        ) : null}
        {attachments.comments.total > 0 ? (
          <EuiText size="xs" color="subdued" data-test-subj="merge-cases-comments-stay">
            {destinationRef != null
              ? i18n.COMMENTS_STAY_EXISTING_CASE(destinationRef)
              : i18n.COMMENTS_STAY}
          </EuiText>
        ) : null}
      </>
    );
  }
);
MergeAttachmentsSection.displayName = 'MergeAttachmentsSection';
