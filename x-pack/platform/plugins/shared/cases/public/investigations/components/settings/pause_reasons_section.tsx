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
  EuiButtonIcon,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  MAX_CASE_PAUSE_REASONS,
  MAX_CASE_PAUSE_REASON_LENGTH,
} from '../../../../common/investigations/statuses';
import type { StatusesConfiguration } from '../../../../common/investigations/statuses';
import { ICONS } from '../../icons';
import { ConfirmModal } from '../shared/confirm_modal';
import type { StatusesDraft } from './status_utils';
import type { SaveStatusesResult } from './use_statuses_editor';
import * as i18n from './translations';

export interface PauseReasonsSectionProps {
  config: StatusesConfiguration;
  isReadOnly: boolean;
  isSaving: boolean;
  save: (draft: StatusesDraft) => Promise<SaveStatusesResult>;
}

interface ReasonFlyoutState {
  /** Position of the reason being edited; undefined when adding one. */
  index?: number;
}

const validateReason = (
  reason: string,
  reasons: string[],
  ignoreIndex: number | undefined
): string | undefined => {
  const trimmed = reason.trim();
  if (trimmed.length === 0) return i18n.REASON_REQUIRED;
  if (trimmed.length > MAX_CASE_PAUSE_REASON_LENGTH) {
    return i18n.REASON_TOO_LONG(MAX_CASE_PAUSE_REASON_LENGTH);
  }
  const normalized = trimmed.toLowerCase();
  const isTaken = reasons.some(
    (existing, index) => index !== ignoreIndex && existing.trim().toLowerCase() === normalized
  );
  return isTaken ? i18n.REASON_DUPLICATE : undefined;
};

interface ReasonFlyoutProps {
  reasons: string[];
  index?: number;
  isSaving: boolean;
  error?: string;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

const ReasonFlyout: React.FC<ReasonFlyoutProps> = ({
  reasons,
  index,
  isSaving,
  error,
  onSubmit,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'investigationReasonFlyoutTitle' });
  const isEditing = index !== undefined;
  const [reason, setReason] = useState(isEditing ? reasons[index] : '');
  const [showErrors, setShowErrors] = useState(false);
  const validation = validateReason(reason, reasons, index);
  const visibleError = showErrors ? validation : undefined;

  const submit = () => {
    setShowErrors(true);
    if (!validation) {
      onSubmit(reason.trim());
    }
  };

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      ownFocus
      aria-labelledby={titleId}
      data-test-subj="investigationReasonFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{isEditing ? i18n.EDIT_REASON_TITLE : i18n.ADD_REASON_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm
          component="form"
          fullWidth
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {error ? (
            <>
              <EuiCallOut
                announceOnMount
                color="danger"
                size="s"
                title={error}
                data-test-subj="investigationReasonFlyoutError"
              />
              <EuiSpacer size="m" />
            </>
          ) : null}
          <EuiFormRow
            label={i18n.REASON_FIELD}
            fullWidth
            isInvalid={Boolean(visibleError)}
            error={visibleError}
          >
            <EuiFieldText
              fullWidth
              autoFocus
              value={reason}
              isInvalid={Boolean(visibleError)}
              onChange={(event) => setReason(event.target.value)}
              data-test-subj="investigationReasonInput"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="investigationReasonCancel">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={isSaving}
              onClick={submit}
              data-test-subj="investigationReasonSubmit"
            >
              {isEditing ? i18n.SAVE : i18n.ADD_REASON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
ReasonFlyout.displayName = 'ReasonFlyout';

interface ReasonRowProps {
  reason: string;
  index: number;
  count: number;
  canEdit: boolean;
  onEdit: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onRemove: () => void;
}

const ReasonRow: React.FC<ReasonRowProps> = ({
  reason,
  index,
  count,
  canEdit,
  onEdit,
  onMove,
  onRemove,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'investigationReasonActions' });
  const isLast = count <= 1;

  const run = (action: () => void) => () => {
    setIsOpen(false);
    action();
  };

  const items = [
    <EuiContextMenuItem
      key="edit"
      onClick={run(onEdit)}
      data-test-subj={`investigationReasonEdit-${index}`}
    >
      {i18n.ACTION_EDIT}
    </EuiContextMenuItem>,
    ...(index > 0
      ? [
          <EuiContextMenuItem
            key="up"
            onClick={run(() => onMove('up'))}
            data-test-subj={`investigationReasonMoveUp-${index}`}
          >
            {i18n.ACTION_MOVE_UP}
          </EuiContextMenuItem>,
        ]
      : []),
    ...(index < count - 1
      ? [
          <EuiContextMenuItem
            key="down"
            onClick={run(() => onMove('down'))}
            data-test-subj={`investigationReasonMoveDown-${index}`}
          >
            {i18n.ACTION_MOVE_DOWN}
          </EuiContextMenuItem>,
        ]
      : []),
    <EuiContextMenuItem
      key="remove"
      disabled={isLast}
      toolTipContent={isLast ? i18n.REMOVE_LAST_REASON : undefined}
      onClick={run(onRemove)}
      data-test-subj={`investigationReasonRemove-${index}`}
    >
      {i18n.ACTION_REMOVE}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      css={css`
        padding: ${euiTheme.size.s} 0;
        border-bottom: ${euiTheme.border.thin};
      `}
      data-test-subj={`investigationReasonRow-${index}`}
    >
      <EuiFlexItem>
        <EuiText size="s">{reason}</EuiText>
      </EuiFlexItem>
      {canEdit ? (
        <EuiFlexItem grow={false}>
          <EuiPopover
            id={popoverId}
            aria-label={i18n.REASON_ACTIONS_ARIA(reason)}
            isOpen={isOpen}
            closePopover={() => setIsOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downRight"
            button={
              <EuiToolTip content={i18n.REASON_ACTIONS_ARIA(reason)} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={ICONS.menu}
                  aria-label={i18n.REASON_ACTIONS_ARIA(reason)}
                  onClick={() => setIsOpen((open) => !open)}
                  data-test-subj={`investigationReasonActions-${index}`}
                />
              </EuiToolTip>
            }
          >
            <EuiContextMenuPanel items={items} />
          </EuiPopover>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
ReasonRow.displayName = 'ReasonRow';

/** The reasons an analyst picks from when pausing an investigation, saved on every change. */
export const PauseReasonsSection: React.FC<PauseReasonsSectionProps> = ({
  config,
  isReadOnly,
  isSaving,
  save,
}) => {
  const [flyout, setFlyout] = useState<ReasonFlyoutState | null>(null);
  const [flyoutError, setFlyoutError] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  const { statuses, pauseReasons } = config;
  const isAtLimit = pauseReasons.length >= MAX_CASE_PAUSE_REASONS;

  const savePauseReasons = async (next: string[]): Promise<boolean> => {
    const result = await save({ statuses, pauseReasons: next });
    setError(result.ok ? undefined : result.error);
    return result.ok;
  };

  const submitFlyout = async (reason: string) => {
    if (!flyout) return;
    const next =
      flyout.index === undefined
        ? [...pauseReasons, reason]
        : pauseReasons.map((existing, index) => (index === flyout.index ? reason : existing));
    const result = await save({ statuses, pauseReasons: next });
    if (result.ok) {
      setFlyout(null);
      setFlyoutError(undefined);
      setError(undefined);
      return;
    }
    setFlyoutError(result.error);
  };

  const move = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    const next = [...pauseReasons];
    [next[index], next[target]] = [next[target], next[index]];
    void savePauseReasons(next);
  };

  const confirmRemove = async () => {
    if (removeIndex === null) return;
    await savePauseReasons(pauseReasons.filter((_reason, index) => index !== removeIndex));
    setRemoveIndex(null);
  };

  const canEdit = !isReadOnly && !isSaving;

  return (
    <section data-test-subj="investigationPauseReasonsSection">
      <EuiTitle size="s">
        <h2>{i18n.PAUSE_REASONS_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>{i18n.PAUSE_REASONS_DESCRIPTION}</p>
      </EuiText>
      {error ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            color="danger"
            title={i18n.SAVE_ERROR_TITLE}
            data-test-subj="investigationPauseReasonsError"
          >
            <p>{error}</p>
            <EuiButtonEmpty size="s" color="danger" onClick={() => setError(undefined)}>
              {i18n.DISMISS}
            </EuiButtonEmpty>
          </EuiCallOut>
        </>
      ) : null}
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="l">
        {pauseReasons.length > 0 ? (
          pauseReasons.map((reason, index) => (
            <ReasonRow
              key={reason}
              reason={reason}
              index={index}
              count={pauseReasons.length}
              canEdit={canEdit}
              onEdit={() => setFlyout({ index })}
              onMove={(direction) => move(index, direction)}
              onRemove={() => setRemoveIndex(index)}
            />
          ))
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.NO_REASONS}
          </EuiText>
        )}
        {isReadOnly ? null : (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent="center" responsive={false}>
              <EuiFlexItem grow={false}>
                {isAtLimit ? (
                  <EuiText size="xs" color="subdued" data-test-subj="investigationReasonLimit">
                    {i18n.REASON_LIMIT(MAX_CASE_PAUSE_REASONS)}
                  </EuiText>
                ) : (
                  <EuiButtonEmpty
                    size="s"
                    iconType={ICONS.add}
                    disabled={!canEdit}
                    onClick={() => setFlyout({})}
                    data-test-subj="investigationAddReason"
                  >
                    {i18n.ADD_REASON}
                  </EuiButtonEmpty>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiPanel>
      {flyout ? (
        <ReasonFlyout
          reasons={pauseReasons}
          index={flyout.index}
          isSaving={isSaving}
          error={flyoutError}
          onSubmit={(reason) => void submitFlyout(reason)}
          onClose={() => {
            setFlyout(null);
            setFlyoutError(undefined);
          }}
        />
      ) : null}
      {removeIndex !== null ? (
        <ConfirmModal
          title={i18n.REMOVE_REASON_TITLE(pauseReasons[removeIndex] ?? '')}
          body={i18n.REMOVE_REASON_BODY}
          confirmLabel={i18n.ACTION_REMOVE}
          destructive
          isLoading={isSaving}
          onConfirm={() => void confirmRemove()}
          onCancel={() => setRemoveIndex(null)}
          data-test-subj="investigationReasonRemoveModal"
        />
      ) : null}
    </section>
  );
};
PauseReasonsSection.displayName = 'PauseReasonsSection';
