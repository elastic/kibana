/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ClaimItem, InvestigationRecord } from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { findItems } from '../../api/client';
import { useBulkCreateItems, useInvestigationToasts } from '../../hooks';
import { ICONS } from '../../icons';
import { useInvestigationsServices } from '../../services';
import * as i18n from './translations';

type StartStatus = 'open' | 'supported';

const EVIDENCE_REF = /^E\d+$/i;

/** Splits "E3, e7 E9" into unique upper-case refs. */
export const parseEvidenceRefs = (input: string): string[] =>
  Array.from(
    new Set(
      input
        .split(/[\s,;]+/)
        .map((token) => token.trim().toUpperCase())
        .filter((token) => token.length > 0)
    )
  );

export interface NewClaimFormProps {
  record: InvestigationRecord;
  onCreated: (claim: ClaimItem | null) => void;
}

/** Adds a claim: a question or a statement, with optional initial evidence refs. */
export const NewClaimForm: React.FC<NewClaimFormProps> = ({ record, onCreated }) => {
  const { http } = useInvestigationsServices();
  const { showSuccess } = useInvestigationToasts();
  const { mutateAsync, isLoading } = useBulkCreateItems(record.id);
  const [text, setText] = useState('');
  const [refsText, setRefsText] = useState('');
  const [startAs, setStartAs] = useState<StartStatus>('open');
  const [textError, setTextError] = useState<string | null>(null);
  const [refsError, setRefsError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const isClosed = record.status === 'closed';

  const submit = async () => {
    const claimText = text.trim();
    const isQuestion = claimText.endsWith('?');
    setTextError(null);
    setRefsError(null);

    if (claimText.length === 0) {
      setTextError(i18n.ERROR_QUESTION_REQUIRED);
      return;
    }
    if (startAs === 'supported' && isQuestion) {
      setTextError(i18n.ERROR_SUPPORTED_NEEDS_STATEMENT);
      return;
    }

    const refs = parseEvidenceRefs(refsText);
    const invalid = refs.filter((ref) => !EVIDENCE_REF.test(ref));
    if (invalid.length > 0) {
      setRefsError(i18n.ERROR_REFS_FORMAT(invalid.join(', ')));
      return;
    }

    let evidenceIds: string[] = [];
    if (refs.length > 0) {
      setIsResolving(true);
      try {
        const { items } = await findItems(http, record.id, {
          kind: ['evidence'],
          refs,
          per_page: INVESTIGATION_LIMITS.maxPerPage,
        });
        const found = new Map(items.map((item) => [item.ref, item.id]));
        const missing = refs.filter((ref) => !found.has(ref));
        if (missing.length > 0) {
          setRefsError(i18n.ERROR_REFS_UNKNOWN(missing.join(', ')));
          return;
        }
        evidenceIds = refs.map((ref) => found.get(ref) ?? '').filter((id) => id.length > 0);
      } catch {
        setRefsError(i18n.ERROR_REFS_LOOKUP);
        return;
      } finally {
        setIsResolving(false);
      }
    }

    try {
      const response = await mutateAsync({
        items: [
          {
            kind: 'claim',
            title: claimText,
            status: startAs,
            claim: {
              question: claimText,
              conclusion: startAs === 'supported' ? claimText : null,
              note: null,
              reasoning: null,
              confidence: null,
              needs_review: false,
              supporting_evidence_ids: evidenceIds,
              opposing_evidence_ids: [],
              gaps: [],
            },
          },
        ],
        extract_indicators: false,
      });
      const [created] = response.items;
      const [serverError] = response.errors;
      if (serverError) {
        setTextError(serverError.message);
        return;
      }
      setText('');
      setRefsText('');
      const createdClaim = created?.kind === 'claim' ? created : null;
      showSuccess(createdClaim ? i18n.CLAIM_ADDED(createdClaim.ref) : i18n.CLAIM_ADDED_GENERIC);
      onCreated(createdClaim);
    } catch {
      // The mutation hook reports the error and the form keeps what was typed.
    }
  };

  if (isClosed) {
    return (
      <EuiCallOut
        announceOnMount={false}
        size="s"
        iconType={ICONS.lock}
        title={i18n.NEW_CLAIM_CLOSED}
        data-test-subj="investigationNewClaimClosed"
      />
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      data-test-subj="investigationNewClaimForm"
    >
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFormRow label={i18n.START_AS}>
            <EuiButtonGroup
              legend={i18n.START_AS}
              buttonSize="compressed"
              idSelected={startAs}
              onChange={(id) => setStartAs(id === 'supported' ? 'supported' : 'open')}
              options={[
                {
                  id: 'open',
                  label: i18n.STATUS_OPEN,
                  'data-test-subj': 'investigationNewClaimStartOpen',
                },
                {
                  id: 'supported',
                  label: i18n.STATUS_SUPPORTED,
                  'data-test-subj': 'investigationNewClaimStartSupported',
                },
              ]}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-inline-size: 14rem;
          `}
        >
          <EuiFormRow
            label={i18n.NEW_CLAIM_LABEL}
            isInvalid={textError !== null}
            error={textError}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              compressed
              value={text}
              maxLength={INVESTIGATION_LIMITS.maxShortTextLength}
              placeholder={i18n.NEW_CLAIM_PLACEHOLDER}
              isInvalid={textError !== null}
              onChange={(event) => {
                setText(event.target.value);
                setTextError(null);
              }}
              data-test-subj="investigationNewClaimInput"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-inline-size: 11rem;
          `}
        >
          <EuiFormRow
            label={i18n.NEW_CLAIM_REFS_LABEL}
            isInvalid={refsError !== null}
            error={refsError}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              compressed
              value={refsText}
              placeholder={i18n.NEW_CLAIM_REFS_PLACEHOLDER}
              isInvalid={refsError !== null}
              onChange={(event) => {
                setRefsText(event.target.value);
                setRefsError(null);
              }}
              data-test-subj="investigationNewClaimRefsInput"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiButton
              type="submit"
              fill
              size="s"
              iconType={ICONS.add}
              isLoading={isLoading || isResolving}
              data-test-subj="investigationNewClaimAdd"
            >
              {i18n.ADD}
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        {startAs === 'open' ? i18n.START_HINT_OPEN : i18n.START_HINT_SUPPORTED}
      </EuiText>
    </form>
  );
};
NewClaimForm.displayName = 'NewClaimForm';
