/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useStableCallback } from '@kbn/react-hooks';
import type { TypeaheadKeyEvent } from './data_reference_picker';
import { DataReferencePicker } from './data_reference_picker';
import {
  clearActiveDataReferenceInsertTarget,
  setActiveDataReferenceInsertTarget,
} from '../../../shared/lib/active_data_reference_insert_target';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import type { TriggerSession } from '../lib/reference_trigger';
import {
  caretInTrigger,
  keepTrigger,
  openTrigger,
  triggerQuery,
  triggerRange,
} from '../lib/reference_trigger';
import { tokenForInsert } from '../lib/reference_value';

/** A key press an editor hands to the field, with the means to keep it from the editor. */
export type EditorKeyEvent = TypeaheadKeyEvent & { readonly stopPropagation?: () => void };

/** What an editor tells the field while a reference is being typed. */
export interface EditorEvents {
  readonly onKeyDown: (event: EditorKeyEvent) => void;
  readonly onCaretChange: (offset: number) => void;
  readonly onBlur: () => void;
}

/** Where a character is drawn, in viewport coordinates. */
export interface CaretRect {
  readonly top: number;
  readonly left: number;
  readonly height: number;
}

export interface ReferenceSelectionBridge {
  readonly focus: () => void;
  readonly getCaret: () => number;
  readonly setCaret: (offset: number) => void;
  /**
   * Replace [start, end) with `text` in a way that joins the editor undo stack.
   * Returns true when the edit was applied.
   */
  readonly replaceText?: (start: number, end: number, text: string) => boolean;
  /** Where `offset` is drawn; undefined when the editor cannot say, as outside its viewport. */
  readonly getCaretRect?: (offset: number) => CaretRect | undefined;
  /** Sends the editor's keys, caret moves and blur to `events`; returns the way to stop. */
  readonly listen?: (events: EditorEvents) => () => void;
}

export interface ReferenceCapableBind {
  readonly value: string;
  /** A reference is being typed, or was asked for with the button. */
  readonly isOpen: boolean;
  readonly teachingPlaceholder: string;
  readonly atButton: React.ReactElement;
  /** Expand control for the field-editor sub-flyout; omitted when `onExpand` is unset. */
  readonly expandButton: React.ReactElement | null;
  /** Insert and expand controls for `EuiFieldText` / similar `append` slots. */
  readonly appendControls: React.ReactElement;
  /**
   * Report a text edit. `typed` is the one character the user just typed, if that is what the
   * edit was: only a typed `{` starts a reference, never a deletion, a paste or an undo.
   */
  readonly reportChange: (next: string, caret: number, typed?: string) => void;
  /** Send a key press of a host that is not a Monaco editor (a plain input) to the dropdown. */
  readonly handleTypeaheadKey: (event: EditorKeyEvent) => void;
  readonly togglePicker: () => void;
  readonly closePicker: () => void;
  /** Open the dropdown so the pick replaces [start, end), e.g. to swap an existing chip. */
  readonly openPickerAtRange: (start: number, end: number) => void;
  readonly attachInputRef: (el: HTMLInputElement | HTMLTextAreaElement | null) => void;
  /** Pass `null` when the editor behind the bridge goes away. */
  readonly registerSelection: (bridge: ReferenceSelectionBridge | null) => void;
  /**
   * For a host that shows the text until it is focused: how to start editing, so the insert
   * button can have an editor to type into. Pass `null` when the host goes away.
   */
  readonly registerEditRequester: (request: (() => void) | null) => void;
}

interface OpenReference {
  readonly session: TriggerSession;
  /** Set when the reference swaps an existing one: a pick replaces [session.start, swapEnd). */
  readonly swapEnd?: number;
}

/**
 * Shared reference affordance for every templatable field control: the insert button, a dropdown
 * of references that opens under a typed `{{` (or a single `{` for plain text) and filters as the
 * variable is typed, and the teaching placeholder. The editor keeps the focus throughout.
 */
export function ReferenceCapableField({
  catalog,
  value,
  onChange,
  onExpand,
  fillHeight = false,
  anchorAtCaret = false,
  openOnBrace = false,
  valueFormWhenWhole = false,
  children,
  'data-test-subj': dataTestSubj = 'workflowStepConfigDataReference',
}: {
  readonly catalog: DataReferenceCatalog;
  readonly value: string;
  readonly onChange: (next: string) => void;
  /** When set, shows an always-visible expand control that opens the field editor. */
  readonly onExpand?: () => void;
  /** Stretch the anchor to fill the parent (expanded field-editor pane). */
  readonly fillHeight?: boolean;
  /**
   * Open the dropdown under the line the reference is typed on, instead of under the control. For a
   * multi-line editor, where the bottom of the control is far from the cursor.
   */
  readonly anchorAtCaret?: boolean;
  /**
   * Also open the dropdown on a single typed `{`. For plain text only: in JSON, KQL and ES|QL
   * `{` is syntax, and only `{{` opens it.
   */
  readonly openOnBrace?: boolean;
  /**
   * A reference that fills the whole field is inserted in the value form (`${{ }}`) instead of
   * the text form; a field that already holds text keeps the text form. For `if` / `while`
   * conditions.
   */
  readonly valueFormWhenWhole?: boolean;
  readonly children: (bind: ReferenceCapableBind) => React.ReactElement;
  readonly 'data-test-subj'?: string;
}) {
  const { euiTheme } = useEuiTheme();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const selectionBridgeRef = useRef<ReferenceSelectionBridge | null>(null);
  const stopListeningRef = useRef<(() => void) | undefined>(undefined);
  const editRequesterRef = useRef<(() => void) | null>(null);
  const openOnEditorRef = useRef(false);
  const keyHandlerRef = useRef<((event: TypeaheadKeyEvent) => boolean) | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState<OpenReference | null>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | undefined>(undefined);
  const [caret, setCaret] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;
  const valueRef = useRef(value);
  valueRef.current = value;

  const insertLabel = i18n.translate('workflows.stepConfigPanel.insertDataReference', {
    defaultMessage: 'Insert data from a prior step',
  });
  const teachingPlaceholder = openOnBrace
    ? i18n.translate('workflows.stepConfigPanel.typeBraceToInsert', {
        defaultMessage: 'Type {brace} to insert data',
        values: { brace: '{' },
      })
    : i18n.translate('workflows.stepConfigPanel.typeBracesToInsert', {
        defaultMessage: 'Type {braces} to insert data',
        values: { braces: '{{' },
      });

  const focusAndSetCaret = useCallback((offset: number) => {
    const bridge = selectionBridgeRef.current;
    if (bridge) {
      bridge.setCaret(offset);
      bridge.focus();
      return;
    }
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(offset, offset);
  }, []);

  const closeTypeahead = useCallback(() => setOpen(null), []);

  // Where the dropdown opens, under the line `offset` is on and relative to this field. It is
  // measured when the reference starts and kept while it is typed: the popover reads its anchor
  // as it opens, so the right position has to be there in the same render.
  const measureAnchor = useCallback(
    (offset: number): { top: number; left: number } | undefined => {
      const rect = anchorAtCaret ? selectionBridgeRef.current?.getCaretRect?.(offset) : undefined;
      const root = rootRef.current;
      if (!rect || !root) return undefined;
      const { top, left } = root.getBoundingClientRect();
      return { top: rect.top + rect.height - top, left: rect.left - left };
    },
    [anchorAtCaret]
  );

  const currentCaret = (): number =>
    selectionBridgeRef.current?.getCaret() ??
    inputRef.current?.selectionStart ??
    valueRef.current.length;

  const openAtCaret = (offset: number) => {
    setCaret(offset);
    setAnchor(measureAnchor(offset));
    setOpen({ session: { start: offset, triggerLength: 0 } });
  };

  const reportChange = useCallback(
    (next: string, nextCaret: number, typed?: string) => {
      onChange(next);
      setCaret(nextCaret);
      const current = openRef.current;
      // A swap is over as soon as the text changes; any other reference goes on while it holds.
      const kept =
        current && current.swapEnd === undefined
          ? keepTrigger(current.session, { text: next, caret: nextCaret, typed })
          : undefined;
      const session = kept ?? openTrigger({ text: next, caret: nextCaret, typed, openOnBrace });
      // A reference that goes on, even with its second brace typed, keeps where it opened.
      if (session && session.start !== current?.session.start) {
        setAnchor(measureAnchor(session.start));
      }
      openRef.current = session ? { session } : null;
      setOpen(openRef.current);
    },
    [measureAnchor, onChange, openOnBrace]
  );

  const handleCaretChange = useStableCallback((offset: number) => {
    setCaret(offset);
    setOpen((current) => {
      if (!current) return null;
      const { session, swapEnd } = current;
      if (swapEnd !== undefined) return offset < session.start || offset > swapEnd ? null : current;
      return caretInTrigger(session, valueRef.current, offset) ? current : null;
    });
  });

  const handleEditorKey = useStableCallback((event: EditorKeyEvent) => {
    if (keyHandlerRef.current?.(event)) event.stopPropagation?.();
  });

  const registerSelection = useStableCallback((bridge: ReferenceSelectionBridge | null) => {
    stopListeningRef.current?.();
    stopListeningRef.current = undefined;
    selectionBridgeRef.current = bridge;
    if (!bridge) {
      setOpen(null);
      return;
    }
    stopListeningRef.current = bridge.listen?.({
      onKeyDown: handleEditorKey,
      onCaretChange: handleCaretChange,
      onBlur: closeTypeahead,
    });
    // The button was pressed on a field that showed text: now there is an editor to type into.
    if (openOnEditorRef.current) {
      openOnEditorRef.current = false;
      openAtCaret(valueRef.current.length);
    }
  });

  const togglePicker = useStableCallback(() => {
    if (openRef.current) {
      setOpen(null);
      return;
    }
    const hasEditor = selectionBridgeRef.current !== null || inputRef.current !== null;
    if (!hasEditor && editRequesterRef.current) {
      openOnEditorRef.current = true;
      editRequesterRef.current();
      return;
    }
    openAtCaret(currentCaret());
  });

  const registerEditRequester = useCallback((request: (() => void) | null) => {
    editRequesterRef.current = request;
  }, []);

  const openPickerAtRange = useCallback(
    (start: number, end: number) => {
      setCaret(end);
      setAnchor(measureAnchor(start));
      setOpen({ session: { start, triggerLength: 0 }, swapEnd: end });
    },
    [measureAnchor]
  );

  const handleInsert = useStableCallback((picked: string) => {
    const bridge = selectionBridgeRef.current;
    const input = inputRef.current;
    const text = valueRef.current;
    const at = currentCaret();
    const reference = openRef.current;
    let range = { start: at, end: at };
    if (reference) {
      range =
        reference.swapEnd === undefined
          ? triggerRange(reference.session, text, at)
          : { start: reference.session.start, end: reference.swapEnd };
    }
    const token = tokenForInsert(picked, text, range.start, range.end, valueFormWhenWhole);

    setOpen(null);

    // Prefer undo-aware edits so Cmd/Ctrl+Z reverts the insertion.
    if (bridge?.replaceText?.(range.start, range.end, token)) {
      return;
    }

    if (input) {
      input.focus();
      input.setSelectionRange(range.start, range.end);
      // insertText participates in the browser undo stack (unlike setting value).
      if (document.execCommand('insertText', false, token)) {
        return;
      }
    }

    const next = `${text.slice(0, range.start)}${token}${text.slice(range.end)}`;
    onChange(next);
    window.requestAnimationFrame(() => {
      focusAndSetCaret(range.start + token.length);
    });
  });

  // Stay registered across blur so click-to-insert from the execution flyout
  // (which steals focus) still targets the last-edited templatable field.
  useEffect(() => {
    return () => {
      clearActiveDataReferenceInsertTarget(handleInsert);
    };
  }, [handleInsert]);

  const claimInsertTarget = useCallback(() => {
    setActiveDataReferenceInsertTarget(handleInsert);
  }, [handleInsert]);

  const atButton = (
    <EuiToolTip content={insertLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="tokenObject"
        color={open ? 'primary' : 'text'}
        size="xs"
        aria-label={insertLabel}
        aria-pressed={open !== null}
        onClick={togglePicker}
        data-test-subj={dataTestSubj}
      />
    </EuiToolTip>
  );

  const expandLabel = i18n.translate('workflows.stepConfigPanel.openExpandedEditor', {
    defaultMessage: 'Open expanded editor',
  });
  const expandButton = onExpand ? (
    <EuiToolTip content={expandLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="fullScreen"
        color="text"
        size="xs"
        aria-label={expandLabel}
        onClick={onExpand}
        data-test-subj={`${dataTestSubj}Expand`}
      />
    </EuiToolTip>
  ) : null;

  const appendControls = (
    <span
      role="presentation"
      // Pressing a control must not take the focus from the editor: it would blur, and the
      // reference being typed would lose its caret.
      onMouseDown={(event) => event.preventDefault()}
      css={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}
    >
      {atButton}
      {expandButton}
    </span>
  );

  const bind: ReferenceCapableBind = {
    value,
    isOpen: open !== null,
    teachingPlaceholder,
    atButton,
    expandButton,
    appendControls,
    reportChange,
    handleTypeaheadKey: handleEditorKey,
    togglePicker,
    closePicker: closeTypeahead,
    openPickerAtRange,
    attachInputRef: (el) => {
      inputRef.current = el;
    },
    registerSelection,
    registerEditRequester,
  };

  const query = open && open.swapEnd === undefined ? triggerQuery(open.session, value, caret) : '';

  // Expanded field editor owns pointer-aware drop; inline fields drop here.
  const dropHandlers = fillHeight
    ? undefined
    : {
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setIsDragOver(true);
        },
        onDragLeave: (e: React.DragEvent) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDragOver(false);
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          setIsDragOver(false);
          const token = e.dataTransfer.getData('text/plain');
          if (token) handleInsert(token);
        },
      };

  return (
    <div
      ref={rootRef}
      onFocusCapture={claimInsertTarget}
      {...dropHandlers}
      data-test-subj={`${dataTestSubj}DropTarget`}
      css={{
        width: '100%',
        ...(fillHeight
          ? {
              flex: '1 1 auto',
              height: '100%',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }
          : {}),
        borderRadius: euiTheme.border.radius.small,
        boxShadow: isDragOver
          ? `inset 0 0 0 2px ${euiTheme.colors.borderStrongPrimary}`
          : undefined,
        transition: `box-shadow ${euiTheme.animation.fast}`,
      }}
    >
      <DataReferencePicker
        catalog={catalog}
        isOpen={open !== null}
        onClose={closeTypeahead}
        onInsert={handleInsert}
        fillHeight={fillHeight}
        typeahead={{ query, keyHandlerRef, anchor }}
        input={children(bind)}
      />
    </div>
  );
}
