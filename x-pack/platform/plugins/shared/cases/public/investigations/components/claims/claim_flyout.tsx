/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { useItem } from '../../hooks';
import { ICONS } from '../../icons';
import { ErrorState } from '../shared/error_state';
import { LoadingState } from '../shared/loading_state';
import type { TabId } from '../tabs/tab_props';
import { ClaimArgumentFlyout } from './claim_argument_flyout';
import { ClaimBanners } from './claim_banners';
import { ClaimComments } from './claim_comments';
import { ClaimDetails } from './claim_details';
import {
  ClaimEditForm,
  draftFromClaim,
  draftToPatch,
  isDraftChanged,
  validateDraft,
} from './claim_edit_form';
import type { ClaimDraft } from './claim_edit_form';
import { ClaimEvidenceSection } from './claim_evidence_section';
import { ClaimFlyoutHeader } from './claim_flyout_header';
import { ClaimHistory } from './claim_history';
import { ClaimSection } from './claim_section';
import { useClaimActions } from './use_claim_actions';
import * as i18n from './translations';

export interface ClaimFlyoutProps {
  record: InvestigationRecord;
  claimId: string;
  onClose: () => void;
  onNavigateTab: (tab: TabId, opts?: { itemId?: string }) => void;
}

/** Everything about one claim: status, reasoning, evidence, history, comments, and edit. */
export const ClaimFlyout: React.FC<ClaimFlyoutProps> = ({
  record,
  claimId,
  onClose,
  onNavigateTab,
}) => {
  const titleId = useGeneratedHtmlId();
  const { data, isLoading, error, refetch } = useItem(record.id, claimId);
  const { patchClaim, isUpdating } = useClaimActions(record.id);
  const [draft, setDraft] = useState<ClaimDraft | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [isWhyOpen, setIsWhyOpen] = useState(false);

  const claim = data?.item.kind === 'claim' ? data.item : null;
  const canEdit = record.status !== 'closed';

  const openEvidence = useCallback(
    (itemId: string) => {
      onClose();
      onNavigateTab('evidence', { itemId });
    },
    [onClose, onNavigateTab]
  );

  if (!claim) {
    return (
      <EuiFlyout
        onClose={onClose}
        size="m"
        ownFocus
        aria-label={i18n.CLAIM_FLYOUT_ARIA}
        data-test-subj="investigationClaimFlyout"
      >
        <EuiFlyoutBody>
          {isLoading ? (
            <LoadingState label={i18n.LOADING_CLAIM} />
          ) : (
            <ErrorState
              title={i18n.CLAIM_LOAD_ERROR}
              error={error ?? undefined}
              onRetry={() => void refetch()}
            />
          )}
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  const errors = draft ? validateDraft(draft) : {};

  const stopEditing = () => {
    setDraft(null);
    setShowErrors(false);
  };

  const save = async () => {
    if (!draft) {
      return;
    }
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    const saved = await patchClaim(claim, draftToPatch(draft), i18n.CLAIM_SAVED(claim.ref));
    if (saved) {
      stopEditing();
    }
  };

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        size="m"
        ownFocus
        aria-labelledby={titleId}
        data-test-subj="investigationClaimFlyout"
      >
        <ClaimFlyoutHeader claim={claim} titleId={titleId} onWhy={() => setIsWhyOpen(true)} />
        <EuiFlyoutBody>
          <ClaimBanners
            recordId={record.id}
            claim={claim}
            canEdit={canEdit}
            onOpenReasoning={() => setIsWhyOpen(true)}
          />
          {draft ? (
            <>
              <ClaimEditForm
                draft={draft}
                errors={errors}
                showErrors={showErrors}
                onChange={setDraft}
              />
              <EuiSpacer size="l" />
            </>
          ) : (
            <ClaimDetails
              claim={claim}
              onOpenConversation={() => {
                onClose();
                onNavigateTab('conversation');
              }}
            />
          )}
          <ClaimSection
            title={i18n.SECTION_EVIDENCE}
            count={claim.claim.supporting_evidence_ids.length}
            data-test-subj="investigationClaimEvidenceSection"
          >
            <ClaimEvidenceSection
              record={record}
              claim={claim}
              canEdit={canEdit}
              onOpenEvidence={openEvidence}
            />
          </ClaimSection>
          <ClaimSection title={i18n.SECTION_HISTORY}>
            <ClaimHistory recordId={record.id} claimId={claim.id} />
          </ClaimSection>
          <ClaimSection title={i18n.SECTION_COMMENTS}>
            <ClaimComments recordId={record.id} claimId={claim.id} canComment={canEdit} />
          </ClaimSection>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={draft ? stopEditing : onClose}
                data-test-subj="investigationClaimClose"
              >
                {draft ? i18n.CANCEL : i18n.CLOSE}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {draft ? (
                <EuiButton
                  fill
                  isLoading={isUpdating}
                  isDisabled={!isDraftChanged(claim, draft)}
                  onClick={() => void save()}
                  data-test-subj="investigationClaimSave"
                >
                  {i18n.SAVE_CHANGES}
                </EuiButton>
              ) : (
                <EuiButton
                  iconType={ICONS.edit}
                  isDisabled={!canEdit}
                  onClick={() => {
                    setDraft(draftFromClaim(claim));
                    setShowErrors(false);
                  }}
                  data-test-subj="investigationClaimEdit"
                >
                  {i18n.EDIT}
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
      {isWhyOpen ? (
        <ClaimArgumentFlyout
          record={record}
          claim={claim}
          onClose={() => setIsWhyOpen(false)}
          onNavigateTab={onNavigateTab}
        />
      ) : null}
    </>
  );
};
ClaimFlyout.displayName = 'ClaimFlyout';
