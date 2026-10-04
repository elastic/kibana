/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelectable,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import * as i18n from '../translations';

export interface PauseReasonModalProps {
  statusLabel: string;
  /** Number of cases the status is applied to; the copy switches to plural above one */
  caseCount: number;
  reasons: string[];
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

/**
 * Asks why a case is being parked before moving it to a status that pauses time tracking.
 * Mirrors the close reason modal; the reason is required because it is what makes the paused
 * time reportable.
 */
export const PauseReasonModal = React.memo<PauseReasonModalProps>(
  ({ statusLabel, caseCount, reasons, onClose, onSubmit }) => {
    const [options, setOptions] = useState<Array<EuiSelectableOption<{ key: string }>>>(() =>
      reasons.map((reason) => ({ key: reason, label: reason }))
    );
    const selected = useMemo(() => options.find((option) => option.checked === 'on'), [options]);
    const submit = useCallback(() => {
      if (selected) {
        onSubmit(selected.key);
      }
    }, [onSubmit, selected]);

    return (
      <EuiModal
        onClose={onClose}
        aria-label={i18n.PAUSE_REASON_MODAL_TITLE}
        data-test-subj="pause-reason-modal"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.PAUSE_REASON_MODAL_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText size="s">
            {caseCount > 1
              ? i18n.PAUSE_REASON_MODAL_BULK_BODY(statusLabel)
              : i18n.PAUSE_REASON_MODAL_BODY(statusLabel)}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiSelectable
            aria-label={i18n.PAUSE_REASON_MODAL_REASON_LABEL}
            options={options}
            onChange={setOptions}
            singleSelection="always"
            listProps={{ bordered: true }}
            data-test-subj="pause-reason-modal-reasons"
          >
            {(list) => list}
          </EuiSelectable>
        </EuiModalBody>
        <EuiModalFooter css={{ justifyContent: 'space-between' }}>
          <EuiButtonEmpty onClick={onClose} data-test-subj="pause-reason-modal-cancel">
            {i18n.CLOSE_CASE_MODAL_CLOSE_BUTTON}
          </EuiButtonEmpty>
          <EuiButton
            onClick={submit}
            fill
            isDisabled={!selected}
            data-test-subj="pause-reason-modal-confirm"
          >
            {caseCount > 1
              ? i18n.PAUSE_REASON_MODAL_CONFIRM_BULK(statusLabel, caseCount)
              : i18n.PAUSE_REASON_MODAL_CONFIRM(statusLabel)}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);

PauseReasonModal.displayName = 'PauseReasonModal';
