/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ClaimItem, EvidenceItem } from '../../../../common/investigations/types';
import {
  useBulkDeleteItems,
  useBulkUpdateItems,
  useInvestigationToasts,
  usePreserveEvidence,
} from '../../hooks';
import { useInvestigationsServices } from '../../services';
import { ICONS } from '../../icons';
import { ConfirmModal } from '../shared/confirm_modal';
import * as i18n from './translations';

export interface BulkBarProps {
  recordId: string;
  selected: EvidenceItem[];
  claims: ClaimItem[];
  onClear: () => void;
  onExportSelected: () => void;
}

export const BulkBar: React.FC<BulkBarProps> = ({
  recordId,
  selected,
  claims,
  onClear,
  onExportSelected,
}) => {
  const { euiTheme } = useEuiTheme();
  const { notifications } = useInvestigationsServices();
  const { showSuccess } = useInvestigationToasts();
  const bulkUpdate = useBulkUpdateItems(recordId);
  const bulkDelete = useBulkDeleteItems(recordId);
  const preserve = usePreserveEvidence(recordId);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  /** The mutation hooks already show the error toast; this only avoids unhandled rejections. */
  const run = (action: () => Promise<void>) => {
    action().catch(() => undefined);
  };

  const count = selected.length;
  const ids = selected.map(({ id }) => id);
  const isBusy = bulkUpdate.isLoading || bulkDelete.isLoading || preserve.isLoading;

  const warnAboutErrors = (failed: number) => {
    if (failed > 0) {
      notifications.toasts.addWarning({ title: i18n.BULK_PARTIAL(failed) });
    }
  };

  const setExcluded = async (excluded: boolean) => {
    const { errors } = await bulkUpdate.mutateAsync({
      items: ids.map((id) => ({ id, patch: { exclude_from_ai: excluded } })),
    });
    warnAboutErrors(errors.length);
    showSuccess(
      excluded
        ? i18n.HIDDEN_FROM_AGENTS(count - errors.length)
        : i18n.SHOWN_TO_AGENTS(count - errors.length)
    );
    onClear();
  };

  const preserveCopies = async () => {
    const { items } = await preserve.mutateAsync({ ids });
    if (items.length === 0) {
      notifications.toasts.addWarning({ title: i18n.PRESERVE_NOTHING });
    } else {
      warnAboutErrors(count - items.length);
      showSuccess(i18n.PRESERVED(items.length));
    }
    onClear();
  };

  const deleteSelected = async () => {
    const { deleted } = await bulkDelete.mutateAsync({ ids });
    setIsDeleteOpen(false);
    showSuccess(i18n.DELETED(deleted));
    onClear();
  };

  const linkToClaim = async (claim: ClaimItem) => {
    setIsLinkOpen(false);
    const existing = new Set(claim.claim.supporting_evidence_ids);
    const supporting = [
      ...claim.claim.supporting_evidence_ids,
      ...ids.filter((id) => !existing.has(id)),
    ];
    const { errors } = await bulkUpdate.mutateAsync({
      items: [
        {
          id: claim.id,
          version: claim.version,
          patch: { claim: { supporting_evidence_ids: supporting } },
        },
      ],
    });
    if (errors.length > 0) {
      notifications.toasts.addWarning({ title: i18n.LINK_CONFLICT(claim.ref) });
      return;
    }
    showSuccess(i18n.LINKED(count, claim.ref));
    onClear();
  };

  return (
    <EuiPanel
      paddingSize="s"
      color="primary"
      hasShadow={false}
      role="toolbar"
      aria-label={i18n.BULK_LABEL}
      data-test-subj="investigationEvidenceBulkBar"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong data-test-subj="investigationEvidenceSelectedCount">
              {i18n.SELECTED(count)}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            aria-label={i18n.LINK_TO_CLAIM}
            button={
              <EuiButton
                size="s"
                fill
                iconType={ICONS.chevronDown}
                iconSide="right"
                isDisabled={isBusy}
                onClick={() => setIsLinkOpen((open) => !open)}
                data-test-subj="investigationEvidenceBulkLink"
              >
                {i18n.LINK_TO_CLAIM}
              </EuiButton>
            }
            isOpen={isLinkOpen}
            closePopover={() => setIsLinkOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            {claims.length === 0 ? (
              <EuiText
                size="s"
                color="subdued"
                css={css`
                  padding: ${euiTheme.size.m};
                `}
              >
                {i18n.NO_CLAIMS}
              </EuiText>
            ) : (
              <EuiContextMenuPanel
                css={css`
                  max-height: ${euiTheme.base * 20}px;
                  max-width: ${euiTheme.base * 24}px;
                  overflow-y: auto;
                `}
                items={claims.map((claim) => (
                  <EuiContextMenuItem
                    key={claim.id}
                    onClick={() => run(() => linkToClaim(claim))}
                    data-test-subj={`investigationEvidenceBulkLink-${claim.ref}`}
                  >
                    <strong>{claim.ref}</strong> {claim.title}
                  </EuiContextMenuItem>
                ))}
              />
            )}
          </EuiPopover>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType={ICONS.export}
            isDisabled={isBusy}
            onClick={onExportSelected}
            data-test-subj="investigationEvidenceBulkExport"
          >
            {i18n.EXPORT_SELECTED}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType={ICONS.agent}
            isDisabled={isBusy}
            isLoading={bulkUpdate.isLoading}
            onClick={() => run(() => setExcluded(true))}
            data-test-subj="investigationEvidenceBulkHide"
          >
            {i18n.HIDE_FROM_AGENTS}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType={ICONS.agent}
            isDisabled={isBusy}
            onClick={() => run(() => setExcluded(false))}
            data-test-subj="investigationEvidenceBulkUnhide"
          >
            {i18n.ALLOW_AGENTS}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType={ICONS.preserved}
            isDisabled={isBusy}
            isLoading={preserve.isLoading}
            onClick={() => run(preserveCopies)}
            data-test-subj="investigationEvidenceBulkPreserve"
          >
            {i18n.PRESERVE_COPIES}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="danger"
            iconType={ICONS.trash}
            isDisabled={isBusy}
            onClick={() => setIsDeleteOpen(true)}
            data-test-subj="investigationEvidenceBulkDelete"
          >
            {i18n.DELETE}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            onClick={onClear}
            data-test-subj="investigationEvidenceBulkClear"
          >
            {i18n.CLEAR_SELECTION}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isDeleteOpen ? (
        <ConfirmModal
          title={i18n.DELETE_TITLE(count)}
          body={<p>{i18n.DELETE_BODY}</p>}
          confirmLabel={i18n.DELETE}
          destructive
          isLoading={bulkDelete.isLoading}
          onConfirm={() => run(deleteSelected)}
          onCancel={() => setIsDeleteOpen(false)}
          data-test-subj="investigationEvidenceDeleteModal"
        />
      ) : null}
    </EuiPanel>
  );
};
BulkBar.displayName = 'BulkBar';
