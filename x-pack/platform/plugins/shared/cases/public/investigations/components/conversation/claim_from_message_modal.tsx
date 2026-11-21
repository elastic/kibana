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
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { ClaimItem, InvestigationRecord } from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { useBulkCreateItems, useInvestigationToasts } from '../../hooks';
import { ICONS } from '../../icons';
import { RelativeTime } from '../shared';
import { toExcerpt } from './messages';
import type { ClaimSource } from './use_claim_sources';
import * as i18n from './translations';

type StartStatus = 'open' | 'supported';

export interface ClaimFromMessageModalProps {
  record: InvestigationRecord;
  source: ClaimSource;
  /** Returns to the message picker; omitted when the message was chosen elsewhere. */
  onBack?: () => void;
  onCreated: (claim: ClaimItem | null) => void;
  onClose: () => void;
}

const LABEL_MAX_LENGTH = 256;

/** The claim form, prefilled from a message; the claim stores a link back to the message. */
export const ClaimFromMessageModal: React.FC<ClaimFromMessageModalProps> = ({
  record,
  source,
  onBack,
  onCreated,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId();
  const formId = useGeneratedHtmlId({ prefix: 'investigationClaimFromMessageForm' });
  const { showSuccess } = useInvestigationToasts();
  const { mutateAsync, isLoading } = useBulkCreateItems(record.id);
  const [question, setQuestion] = useState(() =>
    toExcerpt(source.text, INVESTIGATION_LIMITS.maxShortTextLength)
  );
  const [conclusion, setConclusion] = useState('');
  const [startAs, setStartAs] = useState<StartStatus>('open');
  const [questionError, setQuestionError] = useState<string | null>(null);

  const isClosed = record.status === 'closed';

  const submit = async () => {
    const claimText = question.trim();
    setQuestionError(null);
    if (claimText.length === 0) {
      setQuestionError(i18n.CLAIM_QUESTION_REQUIRED);
      return;
    }
    if (startAs === 'supported' && claimText.endsWith('?')) {
      setQuestionError(i18n.CLAIM_SUPPORTED_NEEDS_STATEMENT);
      return;
    }
    const conclusionText = conclusion.trim();

    try {
      const response = await mutateAsync({
        items: [
          {
            kind: 'claim',
            title: claimText,
            status: startAs,
            claim: {
              question: claimText,
              conclusion:
                startAs === 'supported' ? conclusionText || claimText : conclusionText || null,
              note: null,
              reasoning: null,
              confidence: null,
              needs_review: false,
              supporting_evidence_ids: [],
              opposing_evidence_ids: [],
              gaps: [],
              source_message: {
                conversation_id: source.conversationId,
                message_id: source.messageId,
                label: source.label.slice(0, LABEL_MAX_LENGTH),
                excerpt: toExcerpt(source.text, INVESTIGATION_LIMITS.maxShortTextLength),
              },
            },
          },
        ],
        extract_indicators: false,
      });
      const [created] = response.items;
      const [serverError] = response.errors;
      if (serverError) {
        setQuestionError(serverError.message);
        return;
      }
      const claim = created?.kind === 'claim' ? created : null;
      showSuccess(claim ? i18n.CLAIM_ADDED(claim.ref) : i18n.CLAIM_ADDED_GENERIC);
      onCreated(claim);
    } catch {
      // The mutation hook already reported the error; the form keeps what was typed.
    }
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="investigationClaimFromMessageModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.CLAIM_FORM_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {isClosed ? (
          <EuiCallOut
            announceOnMount={false}
            size="s"
            iconType={ICONS.lock}
            title={i18n.CLAIM_CLOSED}
            data-test-subj="investigationClaimFromMessageClosed"
          />
        ) : (
          <form
            id={formId}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <EuiFormRow label={i18n.CLAIM_SOURCE} fullWidth>
              <EuiPanel
                color="subdued"
                hasShadow={false}
                paddingSize="s"
                data-test-subj="investigationClaimFromMessageSource"
              >
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{source.label}</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {source.authorName} · <RelativeTime value={source.ts} />
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiText size="s">
                  <p>{toExcerpt(source.text)}</p>
                </EuiText>
              </EuiPanel>
            </EuiFormRow>
            <EuiFormRow
              label={i18n.CLAIM_QUESTION}
              isInvalid={questionError !== null}
              error={questionError}
              fullWidth
            >
              <EuiTextArea
                fullWidth
                rows={3}
                value={question}
                maxLength={INVESTIGATION_LIMITS.maxShortTextLength}
                isInvalid={questionError !== null}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  setQuestionError(null);
                }}
                data-test-subj="investigationClaimFromMessageQuestion"
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.CLAIM_STATUS} fullWidth>
              <EuiButtonGroup
                legend={i18n.CLAIM_STATUS}
                buttonSize="compressed"
                idSelected={startAs}
                onChange={(id) => setStartAs(id === 'supported' ? 'supported' : 'open')}
                options={[
                  {
                    id: 'open',
                    label: i18n.CLAIM_STATUS_OPEN,
                    'data-test-subj': 'investigationClaimFromMessageStartOpen',
                  },
                  {
                    id: 'supported',
                    label: i18n.CLAIM_STATUS_SUPPORTED,
                    'data-test-subj': 'investigationClaimFromMessageStartSupported',
                  },
                ]}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.CLAIM_CONCLUSION}
              helpText={i18n.CLAIM_CONCLUSION_HELP}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                value={conclusion}
                maxLength={INVESTIGATION_LIMITS.maxShortTextLength}
                onChange={(event) => setConclusion(event.target.value)}
                data-test-subj="investigationClaimFromMessageConclusion"
              />
            </EuiFormRow>
          </form>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        {onBack ? (
          <EuiButtonEmpty
            iconType={ICONS.chevronLeft}
            onClick={onBack}
            data-test-subj="investigationClaimFromMessageBack"
          >
            {i18n.CLAIM_BACK}
          </EuiButtonEmpty>
        ) : null}
        <EuiButtonEmpty onClick={onClose} data-test-subj="investigationClaimFromMessageCancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          type="submit"
          form={formId}
          fill
          isLoading={isLoading}
          isDisabled={isClosed}
          data-test-subj="investigationClaimFromMessageSubmit"
        >
          {i18n.CLAIM_ADD}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
ClaimFromMessageModal.displayName = 'ClaimFromMessageModal';
