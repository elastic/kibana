/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiText, EuiTextColor, useEuiTheme } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { monaco } from '@kbn/monaco';
import { isMac } from '@kbn/shared-ux-utility';
import { useToasts } from '../../../common/lib/kibana';
import { useGetFieldDefinitions } from '../../field_library/hooks/use_get_field_definitions';
import {
  applyFieldBlock,
  buildFieldScaffold,
  getFieldControlAtLine,
  hasTemplateParseErrors,
  insertTemplateField,
} from '../utils/template_field_actions';
import {
  applyRootFieldBlock,
  getRootFieldControl,
  replaceRootField,
} from '../utils/root_field_actions';
import {
  getDefinedFieldNames,
  getFieldItemMaps,
  parseTemplateDocument,
} from '../utils/template_yaml_ast';
import type { FieldRuleAction } from '../utils/field_action_catalog';
import {
  ActionsMenu,
  ActionsMenuPopover,
  getActionOptions,
  getActionsMenuListboxId,
  ConfigureAndAddModal,
} from './actions_menu';
import type { ActionOptionData, ConfigurableFieldAction } from './actions_menu';
import * as i18n from '../translations';

interface TemplateActionsMenuProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  value: string;
  onChange: (value: string) => void;
  /** Owner used to scope the field-library list. Unused in `fieldDefinition` mode. */
  owner?: string;
  /**
   * Which document shape the menu is editing:
   *  - `template` (default) — the root holds a `fields:` sequence; all four sections are offered and
   *    Validation/Conditional target the field under the cursor.
   *  - `fieldDefinition` — the root IS a single inline field (the field library's definition shape);
   *    only New field (relabeled "Change field type" once a field exists, since picking a type
   *    replaces the whole definition) and Validation are offered, both targeting the root field.
   */
  mode?: 'template' | 'fieldDefinition';
}

const COMMAND_KEY = isMac ? '⌘' : 'Ctrl';
const SHORTCUT_HINT = isMac ? '⌘K' : 'Ctrl+K';

const kbdCss = ({ euiTheme }: Pick<UseEuiTheme, 'euiTheme'>) =>
  css({
    borderColor: euiTheme.colors.borderBaseSubdued,
    borderRadius: euiTheme.border.radius.small,
    borderWidth: euiTheme.border.width.thin,
    borderStyle: 'solid',
    padding: `${euiTheme.size.xxs} ${euiTheme.size.xs}`,
  });

/**
 * The template editor's Actions menu: a bottom-right chip over the Monaco editor (also opened with
 * {@link SHORTCUT_HINT}). Template mode uses the full single-column catalog (search + categories);
 * field-definition mode uses a compact anchored popover. Every action composes the existing pure
 * YAML transforms and writes the result back through `onChange`.
 *
 * The cursor position is snapshotted when the menu opens and the catalog is built for the field at
 * that line (an inline field, or a `$ref` resolved through the field library), so Validation /
 * Conditional logic offer exactly the rules valid for that field (and are disabled with a hint when
 * the cursor is not on a resolvable field).
 */
export const TemplateActionsMenu: React.FC<TemplateActionsMenuProps> = ({
  editor,
  value,
  onChange,
  owner,
  mode = 'template',
}) => {
  const { euiTheme } = useEuiTheme();
  const toasts = useToasts();
  const [isOpen, setIsOpen] = useState(false);
  const [configureAction, setConfigureAction] = useState<ConfigurableFieldAction | null>(null);
  const [bufferHasErrors, setBufferHasErrors] = useState(false);
  const [cursorLine, setCursorLine] = useState<number | undefined>(undefined);

  const testSubjPrefix =
    mode === 'fieldDefinition' ? 'fieldDefinitionActionsMenu' : 'templateActionsMenu';

  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const closeAndFocusEditor = useCallback(() => {
    setConfigureAction(null);
    setIsOpen(false);
    editor?.focus();
  }, [editor]);

  const openMenu = useCallback(() => {
    setCursorLine(editor?.getPosition()?.lineNumber);
    setBufferHasErrors(hasTemplateParseErrors(valueRef.current));
    setIsOpen(true);
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const action = editor.addAction({
      id: 'casesTemplateActionsMenu',
      label: i18n.ACTIONS_MENU_BUTTON,
      // eslint-disable-next-line no-bitwise -- Monaco keybindings are expressed as bitwise OR chords.
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
      run: () => openMenu(),
    });
    return () => action.dispose();
  }, [editor, openMenu]);

  // Prefetch library fields while the menu can be opened (template mode only).
  const {
    data: libraryData,
    isLoading: isLibraryLoading,
    isError: isLibraryError,
  } = useGetFieldDefinitions({
    owner: mode === 'template' ? owner : undefined,
    staleTime: Infinity,
  });
  const libraryFieldDefinitions = libraryData?.fieldDefinitions;

  // Resolved while open rather than snapshotted at open time, so a `$ref` under the cursor picks up
  // its library control once the definitions finish loading.
  const targetField = useMemo(() => {
    if (!isOpen) return null;
    return mode === 'fieldDefinition'
      ? getRootFieldControl(value)
      : getFieldControlAtLine(value, cursorLine, libraryFieldDefinitions);
  }, [isOpen, mode, value, cursorLine, libraryFieldDefinitions]);

  // Parsing the whole template is only needed while the menu is open, not on every keystroke.
  const alreadyLinked = useMemo(() => {
    if (!isOpen || mode !== 'template') return new Set<string>();
    const doc = parseTemplateDocument(value);
    return doc ? getDefinedFieldNames(getFieldItemMaps(doc)) : new Set<string>();
  }, [isOpen, mode, value]);

  const siblingFieldNames = useMemo(() => Array.from(alreadyLinked), [alreadyLinked]);

  const catalog = useMemo(
    () =>
      isOpen
        ? getActionOptions({
            mode,
            bufferHasErrors,
            hasTargetField: targetField != null,
            targetControl: targetField?.control,
            libraryFields: libraryFieldDefinitions ?? [],
            alreadyLinked,
            isLibraryLoading: mode === 'template' && isLibraryLoading,
            isLibraryError: mode === 'template' && isLibraryError,
          })
        : [],
    [
      isOpen,
      mode,
      bufferHasErrors,
      targetField,
      libraryFieldDefinitions,
      alreadyLinked,
      isLibraryLoading,
      isLibraryError,
    ]
  );

  /** Returns whether the field was written; the caller decides what to close. */
  const insertField = useCallback(
    (fieldObject: Record<string, unknown>, displayName: string): boolean => {
      if (mode === 'fieldDefinition') {
        const rootResult = replaceRootField(valueRef.current, fieldObject);
        if (rootResult.status !== 'applied') {
          toasts.addWarning(i18n.ACTIONS_MENU_INVALID_YAML);
          return false;
        }
        onChangeRef.current(rootResult.yaml);
        // With a field already in the buffer this replaces it ("Change field type").
        toasts.addSuccess(
          targetField != null
            ? i18n.ACTIONS_MENU_FIELD_TYPE_CHANGED(displayName)
            : i18n.ACTIONS_MENU_FIELD_ADDED(displayName)
        );
        return true;
      }
      const result = insertTemplateField(valueRef.current, fieldObject, cursorLine);
      if (result.changed) {
        onChangeRef.current(result.yaml);
        toasts.addSuccess(i18n.ACTIONS_MENU_FIELD_ADDED(displayName));
        return true;
      }
      toasts.addWarning(
        result.reason === 'invalid'
          ? i18n.ACTIONS_MENU_INVALID_YAML
          : i18n.ACTIONS_MENU_FIELD_EXISTS(displayName)
      );
      return false;
    },
    [toasts, mode, targetField, cursorLine]
  );

  const applyRule = useCallback(
    (action: FieldRuleAction) => {
      const result =
        mode === 'fieldDefinition'
          ? applyRootFieldBlock(valueRef.current, action.blockKey, action.ruleKey, action.value)
          : applyFieldBlock(
              valueRef.current,
              cursorLine,
              action.blockKey,
              action.ruleKey,
              action.value
            );
      if (result.status === 'applied') {
        onChangeRef.current(result.yaml);
      } else if (result.status === 'invalid') {
        toasts.addWarning(i18n.ACTIONS_MENU_INVALID_YAML);
      } else if (result.status === 'exists') {
        toasts.addWarning(i18n.ACTIONS_MENU_RULE_EXISTS(action.label));
      } else {
        toasts.addWarning(
          mode === 'fieldDefinition'
            ? i18n.ACTIONS_MENU_NO_FIELD_YET
            : i18n.ACTIONS_MENU_NO_FIELD_AT_CURSOR
        );
      }
      closeAndFocusEditor();
    },
    [closeAndFocusEditor, toasts, mode, cursorLine]
  );

  const handleActionSelected = useCallback(
    (action: ActionOptionData) => {
      if (action.disabled) return;
      if (action.kind === 'fieldType') {
        const scaffold = buildFieldScaffold(action.control) ?? action.scaffold;
        insertField(scaffold, action.label);
        closeAndFocusEditor();
        return;
      }
      if (action.kind === 'libraryField') {
        insertField({ $ref: action.fieldName }, action.label);
        closeAndFocusEditor();
        return;
      }
      if (action.kind === 'rule') {
        applyRule(action.rule);
      }
    },
    [insertField, applyRule, closeAndFocusEditor]
  );

  const handleConfigureCancel = useCallback(() => {
    setConfigureAction(null);
  }, []);

  // Keep the modal (and the user's input) open when the insert is rejected.
  const handleConfigureConfirm = useCallback(
    (result: { fieldObject: Record<string, unknown>; displayName: string }) => {
      if (insertField(result.fieldObject, result.displayName)) {
        closeAndFocusEditor();
      }
    },
    [closeAndFocusEditor, insertField]
  );

  const triggerButton = (
    <EuiButtonEmpty
      size="s"
      color="text"
      iconType="plusCircle"
      iconSide="left"
      onClick={() => (isOpen ? closeAndFocusEditor() : openMenu())}
      aria-label={`${i18n.ACTIONS_MENU_ARIA} (${SHORTCUT_HINT})`}
      data-test-subj={`${testSubjPrefix}Button`}
      css={css({
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        border: `1px solid ${euiTheme.colors.borderBasePlain}`,
        borderRadius: euiTheme.border.radius.medium,
      })}
    >
      <EuiText
        size="xs"
        css={css({
          display: 'flex',
          alignItems: 'center',
          gap: euiTheme.size.s,
        })}
      >
        <strong>{i18n.ACTIONS_MENU_BUTTON}</strong>
        <EuiTextColor
          color="subdued"
          css={css({
            display: 'flex',
            gap: 2,
            '& kbd': kbdCss({ euiTheme }),
          })}
        >
          <kbd>{COMMAND_KEY}</kbd>
          <kbd>{'K'}</kbd>
        </EuiTextColor>
      </EuiText>
    </EuiButtonEmpty>
  );

  const isCompact = mode === 'fieldDefinition';

  // Rendered as an absolute chip over the bottom-right of the Monaco editor.
  // Template mode portals a centered single-column menu; field-definition mode
  // anchors a compact popover to this chip.
  return (
    <>
      <div
        css={css({
          position: 'absolute',
          bottom: euiTheme.size.base,
          // 16px base + 12px to clear Monaco's scrollbar / panel edge.
          right: `calc(${euiTheme.size.base} + ${euiTheme.size.m})`,
          zIndex: 1,
        })}
      >
        {isCompact ? (
          <EuiPopover
            isOpen={isOpen}
            closePopover={closeAndFocusEditor}
            button={triggerButton}
            panelPaddingSize="none"
            anchorPosition="upRight"
            ownFocus
            initialFocus={`#${getActionsMenuListboxId(testSubjPrefix)}`}
            repositionOnScroll
            aria-label={i18n.ACTIONS_MENU_ARIA}
            panelStyle={{ width: 360, maxWidth: 'calc(100vw - 32px)' }}
          >
            <ActionsMenu
              options={catalog}
              testSubjPrefix={testSubjPrefix}
              onActionSelected={handleActionSelected}
              onClose={closeAndFocusEditor}
              presentation="compact"
            />
          </EuiPopover>
        ) : (
          triggerButton
        )}
      </div>

      {!isCompact ? (
        <ActionsMenuPopover
          isOpen={isOpen}
          isHidden={configureAction != null}
          closePopover={closeAndFocusEditor}
          options={catalog}
          testSubjPrefix={testSubjPrefix}
          onActionSelected={handleActionSelected}
          onConfigure={setConfigureAction}
          presentation="full"
        />
      ) : null}

      {configureAction ? (
        <ConfigureAndAddModal
          action={configureAction}
          existingFieldNames={alreadyLinked}
          siblingFieldNames={siblingFieldNames}
          onCancel={handleConfigureCancel}
          onConfirm={handleConfigureConfirm}
        />
      ) : null}
    </>
  );
};

TemplateActionsMenu.displayName = 'TemplateActionsMenu';
