/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { findStatusByKey, getEffectiveStatuses } from '../../../../common/investigations/statuses';
import { getHttpErrorMessage, useStatuses, useUpdateRecord } from '../../hooks';
import { ServerErrorsCallout } from '../fields/server_errors_callout';
import { ErrorState } from '../shared/error_state';
import { LoadingState } from '../shared/loading_state';
import type { InvestigationModalProps } from './modal_props';
import * as i18n from './translations';

const NO_REASONS: string[] = [];

/**
 * Moves the investigation to a status that pauses time tracking. The reason comes from the
 * configured pause reasons, as in the Cases pause modal.
 */
export const PauseModal: React.FC<InvestigationModalProps> = ({ record, onClose, statusKey }) => {
  const titleId = useGeneratedHtmlId();
  const listId = useGeneratedHtmlId({ prefix: 'investigationPauseReasons' });
  const { data: configuration, isLoading, error, refetch } = useStatuses();
  const { mutate: updateRecord, isLoading: isSaving } = useUpdateRecord(record.id, {
    silentErrors: true,
  });
  const [reason, setReason] = useState<string | null>(
    record.paused_at ? record.pause_reason ?? null : null
  );
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const target = useMemo(
    () => findStatusByKey(getEffectiveStatuses(configuration?.statuses), statusKey),
    [configuration, statusKey]
  );
  const pauseReasons = configuration?.pauseReasons ?? NO_REASONS;
  const options = useMemo<EuiSelectableOption[]>(
    () =>
      pauseReasons.map((pauseReason) => ({
        label: pauseReason,
        checked: pauseReason === reason ? 'on' : undefined,
        'data-test-subj': `investigationPauseReason-${pauseReason}`,
      })),
    [pauseReasons, reason]
  );
  const statusLabel = target?.label ?? statusKey ?? '';
  const canConfirm = Boolean(target) && reason !== null && !isSaving;

  const onConfirm = () => {
    if (!statusKey || reason === null) {
      return;
    }
    setServerErrors([]);
    updateRecord(
      { status_key: statusKey, pause_reason: reason },
      {
        onSuccess: onClose,
        onError: (saveError) => setServerErrors([getHttpErrorMessage(saveError)]),
      }
    );
  };

  const renderBody = () => {
    if (isLoading) {
      return <LoadingState label={i18n.PAUSE_LOADING} size="m" />;
    }
    if (error || !configuration) {
      return <ErrorState title={i18n.PAUSE_ERROR} error={error} onRetry={() => void refetch()} />;
    }
    if (!target) {
      return <EuiText size="s">{i18n.PAUSE_UNKNOWN_STATUS}</EuiText>;
    }
    return (
      <>
        <EuiText size="s">
          <p data-test-subj="investigationPauseBody">{i18n.PAUSE_BODY(statusLabel)}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow
          label={i18n.PAUSE_REASON_LABEL}
          fullWidth
          helpText={reason === null ? i18n.PAUSE_REASON_REQUIRED : undefined}
        >
          {pauseReasons.length === 0 ? (
            <EuiText size="s" color="subdued">
              {i18n.PAUSE_NO_REASONS}
            </EuiText>
          ) : (
            <EuiSelectable
              id={listId}
              aria-label={i18n.PAUSE_REASON_LABEL}
              singleSelection
              options={options}
              onChange={(next) => {
                const selected = next.find((option) => option.checked === 'on');
                setReason(selected ? selected.label : null);
              }}
              listProps={{ bordered: true, rowHeight: 36 }}
              height={Math.min(pauseReasons.length, 6) * 36}
              data-test-subj="investigationPauseReasonList"
            >
              {(list) => list}
            </EuiSelectable>
          )}
        </EuiFormRow>
        {serverErrors.length > 0 ? (
          <>
            <EuiSpacer size="m" />
            <ServerErrorsCallout
              messages={serverErrors}
              title={i18n.PAUSE_SERVER_ERROR_TITLE}
              data-test-subj="investigationPauseServerError"
            />
          </>
        ) : null}
      </>
    );
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      css={css`
        width: min(520px, 100%);
      `}
      data-test-subj="investigationPauseModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.PAUSE_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>{renderBody()}</EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} isDisabled={isSaving}>
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onConfirm}
              isLoading={isSaving}
              isDisabled={!canConfirm}
              data-test-subj="investigationPauseConfirm"
            >
              {i18n.PAUSE_CONFIRM(statusLabel)}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
PauseModal.displayName = 'PauseModal';
