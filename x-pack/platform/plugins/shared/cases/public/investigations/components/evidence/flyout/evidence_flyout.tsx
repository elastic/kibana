/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { EVIDENCE_TYPE_LABELS } from '../../../../../common/investigations/types';
import type { ClaimItem, EvidenceItem } from '../../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../../common/investigations/constants';
import { getHttpErrorStatus, useItem, usePreserveEvidence, useUpdateItem } from '../../../hooks';
import { EVIDENCE_TYPE_ICONS, ICONS } from '../../../icons';
import { useInvestigationsServices } from '../../../services';
import { ActorBadge } from '../../shared/actor_badge';
import { ErrorState } from '../../shared/error_state';
import { formatAbsoluteUtc } from '../../shared/formatters';
import { LoadingState } from '../../shared/loading_state';
import { RelativeTime } from '../../shared/relative_time';
import { useItemComments, useRecordClaims } from '../use_evidence_queries';
import { CommentsPanel } from './comments_panel';
import { DetailBody } from './detail_body';
import { DetailSection } from './primitives';
import type { DocumentView } from './primitives';
import * as i18n from '../translations';

export type FlyoutTab = 'details' | 'comments' | 'used_in';

const WhyEditor: React.FC<{ item: EvidenceItem; recordId: string }> = ({ item, recordId }) => {
  const updateItem = useUpdateItem(recordId);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(item.evidence.why ?? '');

  const save = () => {
    if (!item.version) {
      return;
    }
    updateItem
      .mutateAsync({
        itemId: item.id,
        patch: { evidence: { why: draft.trim() || null } },
        version: item.version,
      })
      .then(() => setIsEditing(false))
      .catch(() => undefined);
  };

  return (
    <DetailSection
      title={i18n.WHY_LABEL}
      data-test-subj="investigationEvidenceWhy"
      actions={
        isEditing ? undefined : (
          <EuiToolTip content={i18n.EDIT_WHY} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType={ICONS.edit}
              aria-label={i18n.EDIT_WHY}
              onClick={() => {
                setDraft(item.evidence.why ?? '');
                setIsEditing(true);
              }}
              data-test-subj="investigationEvidenceWhyEdit"
            />
          </EuiToolTip>
        )
      }
    >
      {isEditing ? (
        <>
          <EuiTextArea
            fullWidth
            rows={3}
            value={draft}
            maxLength={INVESTIGATION_LIMITS.maxShortTextLength}
            aria-label={i18n.WHY_LABEL}
            onChange={(event) => setDraft(event.target.value)}
            data-test-subj="investigationEvidenceWhyInput"
          />
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={() => setIsEditing(false)}
                data-test-subj="investigationEvidenceWhyCancel"
              >
                {i18n.CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                isLoading={updateItem.isLoading}
                onClick={save}
                data-test-subj="investigationEvidenceWhySave"
              >
                {i18n.SAVE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : item.evidence.why ? (
        <EuiText size="s" data-test-subj="investigationEvidenceWhyText">
          {item.evidence.why}
        </EuiText>
      ) : (
        <EuiText size="s" color="subdued" data-test-subj="investigationEvidenceWhyText">
          {i18n.WHY_EMPTY}
        </EuiText>
      )}
    </DetailSection>
  );
};
WhyEditor.displayName = 'WhyEditor';

const PreservedSection: React.FC<{ item: EvidenceItem; recordId: string }> = ({
  item,
  recordId,
}) => {
  const preserve = usePreserveEvidence(recordId);
  const { notifications } = useInvestigationsServices();
  const { evidence } = item;

  const preserveNow = () => {
    preserve
      .mutateAsync({ ids: [item.id] })
      .then(({ items }) => {
        if (items.length === 0) {
          notifications.toasts.addWarning({ title: i18n.PRESERVE_NOTHING });
        } else {
          notifications.toasts.addSuccess({ title: i18n.PRESERVED(1) });
        }
      })
      .catch(() => undefined);
  };

  return (
    <DetailSection
      title={i18n.PRESERVED_COPY}
      data-test-subj="investigationEvidencePreservedSection"
    >
      {evidence.source_expired ? (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            iconType={ICONS.expired}
            title={i18n.SOURCE_EXPIRED_TITLE}
            data-test-subj="investigationEvidenceSourceExpired"
            text={i18n.SOURCE_EXPIRED_BODY}
          />
          <EuiSpacer size="s" />
        </>
      ) : null}
      {evidence.snapshot_hash ? (
        <>
          <EuiText size="s" data-test-subj="investigationEvidencePreservedHash">
            {i18n.PRESERVED_SUMMARY_PREFIX}
            <EuiCode>{evidence.snapshot_hash}</EuiCode>
            {evidence.preserved_at
              ? `, ${i18n.PRESERVED_ON(formatAbsoluteUtc(evidence.preserved_at))}`
              : ''}
          </EuiText>
          {evidence.integrity_note ? (
            <EuiText size="xs" color="subdued" data-test-subj="investigationEvidenceIntegrityNote">
              {evidence.integrity_note}
            </EuiText>
          ) : null}
        </>
      ) : (
        <>
          <EuiText size="s" color="subdued">
            {i18n.NOT_PRESERVED}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiButton
            size="s"
            iconType={ICONS.preserved}
            isLoading={preserve.isLoading}
            onClick={preserveNow}
            data-test-subj="investigationEvidencePreserve"
          >
            {i18n.PRESERVE_A_COPY}
          </EuiButton>
        </>
      )}
    </DetailSection>
  );
};
PreservedSection.displayName = 'PreservedSection';

const UsedInPanel: React.FC<{
  claims: ClaimItem[];
  onOpenClaim: (claimId: string) => void;
}> = ({ claims, onOpenClaim }) => (
  <div data-test-subj="investigationEvidenceUsedIn">
    {claims.length === 0 ? (
      <EuiText size="s" color="subdued" data-test-subj="investigationEvidenceUsedInEmpty">
        <p>{i18n.NOT_USED_IN_CLAIMS}</p>
      </EuiText>
    ) : (
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        {claims.map((claim) => (
          <EuiFlexItem key={claim.id}>
            <EuiText size="s">
              <EuiLink
                onClick={() => onOpenClaim(claim.id)}
                data-test-subj={`investigationEvidenceUsedInClaim-${claim.ref}`}
              >
                {claim.ref}
              </EuiLink>{' '}
              {claim.title}{' '}
              <EuiBadge color="hollow">
                {claim.claim.opposing_evidence_ids.length > 0 &&
                !claim.claim.supporting_evidence_ids.length
                  ? i18n.CLAIM_OPPOSES
                  : i18n.CLAIM_SUPPORTS}
              </EuiBadge>
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    )}
  </div>
);
UsedInPanel.displayName = 'UsedInPanel';

export interface EvidenceFlyoutProps {
  recordId: string;
  itemId: string;
  initialTab: FlyoutTab;
  documentView: DocumentView;
  onDocumentViewChange: (view: DocumentView) => void;
  onClose: () => void;
  onOpenClaim: (claimId: string) => void;
  onOpenConversation: () => void;
}

export const EvidenceFlyout: React.FC<EvidenceFlyoutProps> = ({
  recordId,
  itemId,
  initialTab,
  documentView,
  onDocumentViewChange,
  onClose,
  onOpenClaim,
  onOpenConversation,
}) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'investigationEvidenceFlyoutTitle' });
  const { data, isLoading, error, refetch } = useItem(recordId, itemId);
  const { claims } = useRecordClaims(recordId);
  const { total: commentCount } = useItemComments(recordId, itemId);
  const updateItem = useUpdateItem(recordId);
  const [tab, setTab] = useState<FlyoutTab>(initialTab);

  const item = data?.item.kind === 'evidence' ? data.item : undefined;
  const usedIn = useMemo(
    () =>
      claims.filter(
        ({ claim }) =>
          claim.supporting_evidence_ids.includes(itemId) ||
          claim.opposing_evidence_ids.includes(itemId)
      ),
    [claims, itemId]
  );

  const renderBody = (evidenceItem: EvidenceItem) => {
    if (tab === 'comments') {
      return <CommentsPanel recordId={recordId} itemId={itemId} />;
    }
    if (tab === 'used_in') {
      return <UsedInPanel claims={usedIn} onOpenClaim={onOpenClaim} />;
    }
    return (
      <>
        <WhyEditor key={evidenceItem.version} item={evidenceItem} recordId={recordId} />
        <PreservedSection item={evidenceItem} recordId={recordId} />
        <DetailBody
          item={evidenceItem}
          recordId={recordId}
          documentView={documentView}
          onDocumentViewChange={onDocumentViewChange}
        />
      </>
    );
  };

  return (
    <EuiFlyout
      size="m"
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      closeButtonProps={{ 'aria-label': i18n.CLOSE_EVIDENCE }}
      data-test-subj="investigationEvidenceFlyout"
    >
      {isLoading ? (
        <EuiFlyoutBody>
          <LoadingState label={i18n.LOADING_ITEM} />
        </EuiFlyoutBody>
      ) : error || !item ? (
        <EuiFlyoutBody>
          <ErrorState
            title={getHttpErrorStatus(error) === 404 ? i18n.ITEM_NOT_FOUND : undefined}
            error={error}
            onRetry={() => void refetch()}
          />
        </EuiFlyoutBody>
      ) : (
        <>
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="investigationEvidenceFlyoutRef">
                  {item.ref}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" iconType={EVIDENCE_TYPE_ICONS[item.evidence.type]}>
                  {EVIDENCE_TYPE_LABELS[item.evidence.type]}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiTitle size="s">
              <h2
                id={titleId}
                css={css`
                  overflow-wrap: anywhere;
                `}
              >
                {item.title}
              </h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup
              gutterSize="m"
              alignItems="center"
              responsive={false}
              wrap
              data-test-subj="investigationEvidenceFlyoutMeta"
            >
              <EuiFlexItem grow={false}>
                <ActorBadge actor={item.created_by} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <RelativeTime value={item.created_at} />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.SOURCE_LABEL(item.evidence.source.label)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow />
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  compressed
                  label={i18n.HIDE_FROM_AGENTS}
                  checked={Boolean(item.exclude_from_ai)}
                  disabled={!item.version || updateItem.isLoading}
                  onChange={(event) => {
                    if (!item.version) return;
                    updateItem
                      .mutateAsync({
                        itemId: item.id,
                        patch: { exclude_from_ai: event.target.checked },
                        version: item.version,
                      })
                      .catch(() => undefined);
                  }}
                  data-test-subj="investigationEvidenceHideFromAgents"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiTabs
              bottomBorder={false}
              css={css`
                margin-block-start: ${euiTheme.size.m};
              `}
            >
              <EuiTab
                isSelected={tab === 'details'}
                onClick={() => setTab('details')}
                data-test-subj="investigationEvidenceTab-details"
              >
                {i18n.TAB_DETAILS}
              </EuiTab>
              <EuiTab
                isSelected={tab === 'comments'}
                onClick={() => setTab('comments')}
                append={<EuiBadge color="hollow">{commentCount}</EuiBadge>}
                data-test-subj="investigationEvidenceTab-comments"
              >
                {i18n.TAB_COMMENTS}
              </EuiTab>
              <EuiTab
                isSelected={tab === 'used_in'}
                onClick={() => setTab('used_in')}
                append={<EuiBadge color="hollow">{usedIn.length}</EuiBadge>}
                data-test-subj="investigationEvidenceTab-used_in"
              >
                {i18n.TAB_USED_IN}
              </EuiTab>
            </EuiTabs>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>{renderBody(item)}</EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                {item.evidence.type === 'conversation' ? (
                  <EuiButtonEmpty
                    iconType={ICONS.chevronRight}
                    iconSide="right"
                    onClick={onOpenConversation}
                    data-test-subj="investigationEvidenceOpenConversation"
                  >
                    {i18n.OPEN_IN_CONVERSATION}
                  </EuiButtonEmpty>
                ) : null}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={onClose} data-test-subj="investigationEvidenceFlyoutBack">
                  {i18n.BACK_TO_INVESTIGATION}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </>
      )}
    </EuiFlyout>
  );
};
EvidenceFlyout.displayName = 'EvidenceFlyout';
