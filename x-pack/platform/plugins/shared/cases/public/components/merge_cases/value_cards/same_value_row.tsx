/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { CANCEL, EDIT, EDIT_FIELD_ARIA_LABEL } from '../translations';
import type { MergeFieldKey } from '../utils';
import { getFieldRowId } from './field_row';
import * as i18n from './translations';

export interface SameValueEditor<D> {
  /** What the input starts from: the value the merged case gets now. */
  initialDraft: D;
  renderInput: (draft: D, onChange: (next: D) => void) => React.ReactNode;
  /** Whether the draft can be saved, such as a title that isn't empty. */
  canSave?: (draft: D) => boolean;
  onSave: (draft: D) => void;
}

export interface SameValueRowProps<D> {
  fieldKey: MergeFieldKey;
  label: string;
  /** The value the merged case gets. */
  value: React.ReactNode;
  /** Set once the user changed the value: what the cases hold, such as "No in all 4 cases". */
  changedFrom?: string;
  editor: SameValueEditor<D>;
  onUndo: () => void;
  isDisabled: boolean;
}

const FOCUSABLE = 'input, textarea, select, button, [tabindex]:not([tabindex="-1"])';

/**
 * A value every case agrees on, which the merged case keeps unless the user edits it here. A change
 * reads "Your change", says what the cases hold, and can be undone.
 */
export const SameValueRow = <D,>({
  fieldKey,
  label,
  value,
  changedFrom,
  editor,
  onUndo,
  isDisabled,
}: SameValueRowProps<D>) => {
  const { euiTheme } = useEuiTheme();
  // Wrapped, so a draft that is itself `null`, such as no category, still means "editing".
  const [draft, setDraft] = useState<{ value: D } | null>(null);
  const inputRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const shouldRestoreFocus = useRef(false);
  const isEditing = draft != null;
  const isChanged = changedFrom != null;

  useEffect(() => {
    if (isEditing) {
      const input = inputRef.current;
      if (input != null && !input.contains(document.activeElement)) {
        input.querySelector<HTMLElement>(FOCUSABLE)?.focus();
      }
      return;
    }
    // Saving, cancelling and undoing each replace the button that had focus.
    if (shouldRestoreFocus.current) {
      shouldRestoreFocus.current = false;
      actionsRef.current?.querySelector<HTMLElement>('button')?.focus();
    }
  }, [isEditing, isChanged]);

  const close = () => {
    shouldRestoreFocus.current = true;
    setDraft(null);
  };
  const undo = () => {
    shouldRestoreFocus.current = true;
    onUndo();
  };
  const canSave = draft != null && (editor.canSave?.(draft.value) ?? true);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft == null || !canSave || isDisabled) {
      return;
    }
    editor.onSave(draft.value);
    close();
  };

  return (
    <div
      id={getFieldRowId(fieldKey)}
      tabIndex={-1}
      role="group"
      aria-label={label}
      css={css`
        display: grid;
        grid-template-columns: 150px minmax(0, 1fr) auto;
        gap: ${euiTheme.size.m};
        align-items: ${isEditing ? 'start' : 'center'};
        padding: ${euiTheme.size.m} ${euiTheme.size.base};
        background: ${isEditing ? euiTheme.colors.backgroundBaseSubdued : 'transparent'};
        &:focus-visible {
          outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
          outline-offset: -${euiTheme.focus.width};
        }
      `}
      data-test-subj={`merge-same-row-${fieldKey}`}
      data-merge-same-changed={isChanged ? 'true' : undefined}
    >
      <EuiText
        size="s"
        css={css`
          padding-top: ${isEditing ? euiTheme.size.xs : 0};
        `}
      >
        <strong>{label}</strong>
      </EuiText>
      {draft != null ? (
        <form
          onSubmit={onSubmit}
          css={css`
            grid-column: 2 / -1;
            display: flex;
            flex-direction: column;
            gap: ${euiTheme.size.s};
            min-width: 0;
          `}
          data-test-subj="merge-same-edit-form"
        >
          <div ref={inputRef}>
            {editor.renderInput(draft.value, (next) => setDraft({ value: next }))}
          </div>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                type="submit"
                size="s"
                fill
                minWidth={false}
                isDisabled={!canSave || isDisabled}
                data-test-subj="merge-same-save"
              >
                {i18n.SAME_SAVE}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" onClick={close} data-test-subj="merge-same-cancel">
                {CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </form>
      ) : (
        <>
          <div
            css={css`
              min-width: 0;
              overflow-wrap: anywhere;
            `}
          >
            <EuiText size="s" data-test-subj="merge-same-value">
              {value}
            </EuiText>
            {isChanged ? (
              <EuiText size="xs" color="subdued" data-test-subj="merge-same-changed-from">
                {changedFrom}
              </EuiText>
            ) : null}
          </div>
          <div
            ref={actionsRef}
            css={css`
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              gap: ${euiTheme.size.xxs};
            `}
          >
            {isChanged ? (
              <>
                <EuiText size="xs" color="success" data-test-subj="merge-same-your-change">
                  <span
                    css={css`
                      display: inline-flex;
                      gap: ${euiTheme.size.xs};
                      align-items: center;
                      white-space: nowrap;
                    `}
                  >
                    <EuiIcon type="check" size="s" aria-hidden={true} />
                    {i18n.SAME_YOUR_CHANGE}
                  </span>
                </EuiText>
                <EuiButtonEmpty
                  size="xs"
                  flush="right"
                  onClick={undo}
                  isDisabled={isDisabled}
                  aria-label={i18n.SAME_UNDO_ARIA(label)}
                  data-test-subj="merge-same-undo"
                >
                  {i18n.SAME_UNDO}
                </EuiButtonEmpty>
              </>
            ) : (
              <EuiButtonEmpty
                size="xs"
                flush="right"
                iconType="pencil"
                onClick={() => setDraft({ value: editor.initialDraft })}
                isDisabled={isDisabled}
                aria-label={EDIT_FIELD_ARIA_LABEL(label)}
                data-test-subj="merge-same-edit"
              >
                {EDIT}
              </EuiButtonEmpty>
            )}
          </div>
        </>
      )}
    </div>
  );
};
SameValueRow.displayName = 'SameValueRow';
