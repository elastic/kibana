/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ActionModalPrimaryAction {
  label: string;
  icon?: string;
  /**
   * Called with the rationale text when the primary button is clicked. A returned promise is
   * awaited so the button can show its own loading state; the caller decides what happens on
   * rejection (typically a toast) — this modal only resets the button so the analyst can retry.
   */
  onClick: (rationale: string) => void | Promise<void>;
  color?: 'primary' | 'danger' | 'warning' | 'success' | 'text' | 'accent';
}

interface BaseActionModalProps {
  type: 'assign' | 'dismiss';
  title: string;
  /** Case/record ID shown in the decision-history body sentence */
  recordId: string;
  /** Optional content rendered between the body text and the rationale field (e.g. an "Assign to" select) */
  children?: React.ReactNode;
  hasAssigneeError?: boolean;
  rationalePlaceholder: string;
  primaryAction: ActionModalPrimaryAction;
  onClose: () => void;
}

export const BaseActionModal = memo<BaseActionModalProps>(
  ({
    type,
    title,
    recordId,
    children,
    hasAssigneeError,
    rationalePlaceholder,
    primaryAction,
    onClose,
  }) => {
    const [rationale, setRationale] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Resets on rejection so the analyst can retry; a resolved click is expected to close the
    // modal from the caller's `onSuccess`, so there is no unmounted-component update to guard.
    const handlePrimaryClick = useCallback(async () => {
      setIsSubmitting(true);
      try {
        await primaryAction.onClick(rationale);
      } catch {
        setIsSubmitting(false);
      }
    }, [primaryAction, rationale]);

    return (
      <EuiModal
        aria-label={i18n.translate('xpack.alertzero.actionModal.ariaLabel', {
          defaultMessage: 'Action modal',
        })}
        onClose={onClose}
        style={{ width: 480 }}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle size="s">{title}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {recordId ? (
            <>
              <EuiText size="s">
                <p>
                  {i18n.translate('xpack.alertzero.actionModal.bodyText', {
                    defaultMessage:
                      "{recordId} — your decision and rationale are recorded in the proposal's decision history.",
                    values: { recordId },
                  })}
                </p>
              </EuiText>
              <EuiSpacer size="m" />
            </>
          ) : null}

          {children ? (
            <>
              {children}
              <EuiSpacer size="m" />
            </>
          ) : null}

          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.alertzero.actionModal.rationaleLabel', {
              defaultMessage: 'Rationale',
            })}
            helpText={i18n.translate('xpack.alertzero.actionModal.rationaleHelpText', {
              defaultMessage: 'Required — captured for audit and evaluation.',
            })}
          >
            <EuiTextArea
              fullWidth
              placeholder={rationalePlaceholder}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={4}
              resize="vertical"
            />
          </EuiFormRow>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose} isDisabled={isSubmitting}>
            {i18n.translate('xpack.alertzero.actionModal.cancel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            fill
            color={primaryAction.color ?? 'primary'}
            iconType={primaryAction.icon}
            onClick={handlePrimaryClick}
            isLoading={isSubmitting}
            isDisabled={
              isSubmitting || (type === 'assign' && hasAssigneeError) || rationale.trim() === ''
            }
          >
            {primaryAction.label}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);

BaseActionModal.displayName = 'BaseActionModal';
