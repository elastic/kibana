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
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { VERDICT_LABELS } from '../../../../common/investigations/types';
import type { Verdict } from '../../../../common/investigations/types';
import { useUpdateRecord } from '../../hooks';
import type { InvestigationModalProps } from './modal_props';
import * as i18n from './translations';

const VERDICT_OPTIONS: ReadonlyArray<{ verdict: Verdict; help: string }> = [
  { verdict: 'true_positive', help: i18n.DETERMINATION_TRUE_POSITIVE_HELP },
  { verdict: 'false_positive', help: i18n.DETERMINATION_FALSE_POSITIVE_HELP },
  { verdict: 'benign_positive', help: i18n.DETERMINATION_BENIGN_POSITIVE_HELP },
  { verdict: 'suspicious', help: i18n.DETERMINATION_SUSPICIOUS_HELP },
  { verdict: 'undetermined', help: i18n.DETERMINATION_UNDETERMINED_HELP },
];

/** Sets or edits the analyst determination, which becomes the final verdict. */
export const DeterminationModal: React.FC<InvestigationModalProps> = ({ record, onClose }) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId();
  const groupName = useGeneratedHtmlId({ prefix: 'determination' });
  const { analyst_verdict: current, agent_verdict: agent } = record;

  const [verdict, setVerdict] = useState<Verdict>(
    current?.verdict ??
      record.human_verdict ??
      agent?.classification ??
      record.ai_verdict?.verdict ??
      'undetermined'
  );
  const [reason, setReason] = useState(current?.reason ?? '');

  const { mutate: save, isLoading: isSaving } = useUpdateRecord(record.id, {
    successMessage: i18n.DETERMINATION_SAVED,
  });
  const { mutate: revert, isLoading: isReverting } = useUpdateRecord(record.id, {
    successMessage: i18n.DETERMINATION_REVERTED,
  });
  const isBusy = isSaving || isReverting;

  const onSave = () => {
    // An empty reason is sent on purpose: omitting it keeps the previous reason on the server.
    save({ analyst_verdict: { verdict, reason: reason.trim() } }, { onSuccess: onClose });
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      css={css`
        width: min(560px, 100%);
      `}
      data-test-subj="investigationDeterminationModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {current ? i18n.DETERMINATION_EDIT_TITLE : i18n.DETERMINATION_TITLE}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>{i18n.DETERMINATION_INTRO}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <div
          role="radiogroup"
          aria-label={i18n.DETERMINATION_OPTIONS_LABEL}
          css={css`
            display: flex;
            flex-direction: column;
            gap: ${euiTheme.size.s};
          `}
        >
          {VERDICT_OPTIONS.map((option) => (
            <div
              key={option.verdict}
              data-test-subj={`investigationDeterminationOption-${option.verdict}`}
            >
              <EuiCheckableCard
                id={`${groupName}-${option.verdict}`}
                name={groupName}
                checkableType="radio"
                value={option.verdict}
                checked={verdict === option.verdict}
                onChange={() => setVerdict(option.verdict)}
                label={<strong>{VERDICT_LABELS[option.verdict]}</strong>}
              >
                <EuiText size="s" color="subdued">
                  {option.help}
                </EuiText>
              </EuiCheckableCard>
            </div>
          ))}
        </div>
        <EuiSpacer size="m" />
        <EuiFormRow
          label={i18n.DETERMINATION_REASON_LABEL}
          labelAppend={
            <EuiText size="xs" color="subdued">
              {i18n.OPTIONAL}
            </EuiText>
          }
          fullWidth
        >
          <EuiTextArea
            fullWidth
            rows={3}
            maxLength={INVESTIGATION_LIMITS.maxShortTextLength}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={i18n.DETERMINATION_REASON_PLACEHOLDER}
            data-test-subj="investigationDeterminationReason"
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {current && agent ? (
              <EuiButtonEmpty
                color="text"
                isLoading={isReverting}
                isDisabled={isBusy}
                onClick={() => revert({ analyst_verdict: null }, { onSuccess: onClose })}
                data-test-subj="investigationDeterminationRevert"
              >
                {i18n.DETERMINATION_REVERT}
              </EuiButtonEmpty>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClose} isDisabled={isBusy}>
                  {i18n.CANCEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={onSave}
                  isLoading={isSaving}
                  isDisabled={isBusy}
                  data-test-subj="investigationDeterminationSave"
                >
                  {i18n.DETERMINATION_SAVE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
DeterminationModal.displayName = 'DeterminationModal';
