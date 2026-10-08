/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiButtonEmpty, EuiCode, EuiContextMenu, EuiPopover, useEuiTheme } from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { css } from '@emotion/react';
import { monaco } from '@kbn/monaco';
import { isMac } from '@kbn/shared-ux-utility';
import { useToasts } from '../../../common/lib/kibana';
import { FIELD_DEFAULT_SNIPPETS } from '../utils/template_field_snippets';
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
import { getConditionalLogicActions, getValidationActions } from '../utils/field_action_catalog';
import type { FieldRuleAction } from '../utils/field_action_catalog';
import { FieldLibraryMenuPanel } from './field_library_menu_panel';
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

// The field controls offered by "New field", derived from the same snippet catalog the editor's
// autocomplete uses (single source of truth for label + description + shape). Only snippets that
// declare a `control` are field-type scaffolds; the `$ref` snippet is served by the Field library.
const NEW_FIELD_ITEMS = FIELD_DEFAULT_SNIPPETS.filter(
  (snippet) => typeof (snippet.body as { control?: unknown }).control === 'string'
).map((snippet) => ({
  control: (snippet.body as { control: string }).control,
  label: snippet.label,
  description: snippet.description,
}));

const PANEL_IDS = {
  root: 'root',
  newField: 'newField',
  fieldLibrary: 'fieldLibrary',
  validation: 'validation',
  conditional: 'conditional',
} as const;

// Platform detection comes from the shared util (uses the modern userAgentData API with fallbacks).
const SHORTCUT_HINT = isMac ? '⌘K' : 'Ctrl+K';

// Shared width for the popover panels + the field-library selectable, so the menu never resize-jumps
// between the root panel and the (deeper) library/field-type panels.
const PANEL_WIDTH = 320;

/**
 * A two-line menu row (bold title + subdued description). Built from phrasing-content elements only
 * (`span`/`strong`/`small`) because `EuiContextMenuItem` renders `name` inside a `<button>`, where
 * block elements are invalid — this keeps the markup valid for assistive tech. The description is
 * part of the button's accessible name, so a screen reader reads e.g. "New field, Scaffold a custom
 * field of any type". `textSubdued` meets EUI's AA contrast on the menu surface.
 */
const MenuItemLabel: React.FC<{ title: string; description?: string }> = ({
  title,
  description,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <span css={css({ display: 'flex', flexDirection: 'column', gap: euiTheme.size.xxs })}>
      <strong>{title}</strong>
      {description ? (
        <small css={css({ color: euiTheme.colors.textSubdued })}>{description}</small>
      ) : null}
    </span>
  );
};
MenuItemLabel.displayName = 'MenuItemLabel';

/**
 * The template editor's Actions menu: a bottom-right trigger (also opened with {@link SHORTCUT_HINT})
 * that drills into New field / Field library / Validation / Conditional logic. Every action composes
 * the existing pure YAML transforms (snippet scaffolds, `$ref` links, validation/display blocks) and
 * writes the result back through `onChange`, so the menu adds discoverability without a second code
 * path for editing the definition.
 *
 * The cursor position and the field it points at are snapshotted when the menu opens; the panels are
 * built from that snapshot, so Validation / Conditional logic offer exactly the rules valid for the
 * field under the cursor (and are disabled with a hint when the cursor is not on a field).
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
  // The field the rule sections act on: the field under the cursor (template mode) or the document
  // root (fieldDefinition mode), snapshotted when the menu opens.
  const [targetField, setTargetField] = useState<{ control: string; name?: string } | null>(null);
  // Snapshotted when the menu opens: a buffer with YAML errors can't be re-serialized, so every
  // mutating branch is disabled with a hint rather than silently failing on click.
  const [bufferHasErrors, setBufferHasErrors] = useState(false);
  const cursorLineRef = useRef<number | undefined>(undefined);

  // Test-subj prefix per mode, so a future page/test rendering both editors never has colliding
  // selectors and the template tour's `templateActionsMenuButton` anchor stays byte-stable.
  const testSubjPrefix =
    mode === 'fieldDefinition' ? 'fieldDefinitionActionsMenu' : 'templateActionsMenu';

  // Keep the latest YAML + change handler in refs so the Monaco keyboard command (registered once)
  // always reads the current buffer rather than a stale closure.
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const closeAndFocusEditor = useCallback(() => {
    setIsOpen(false);
    editor?.focus();
  }, [editor]);

  const openMenu = useCallback(() => {
    const line = editor?.getPosition()?.lineNumber;
    cursorLineRef.current = line;
    setBufferHasErrors(hasTemplateParseErrors(valueRef.current));
    // A definition document has exactly one field (the root), so the cursor position is irrelevant.
    setTargetField(
      mode === 'fieldDefinition'
        ? getRootFieldControl(valueRef.current)
        : getFieldControlAtLine(valueRef.current, line)
    );
    setIsOpen(true);
  }, [editor, mode]);

  // Cmd/Ctrl+K opens the menu from within the editor. Registered as a Monaco editor action (scoped to
  // the editor and disposed with it) rather than the shared `useKeyboardShortcut` hook: that hook
  // deliberately ignores keydowns on editable targets, but this shortcut must fire while the author is
  // typing in the editor (a textarea) — exactly where it would be suppressed.
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

  const insertField = useCallback(
    (fieldObject: Record<string, unknown>, displayName: string) => {
      // In fieldDefinition mode the document root IS the field, so picking a type swaps the whole
      // definition (create and change-type are the same operation) — there is no "already exists".
      if (mode === 'fieldDefinition') {
        const rootResult = replaceRootField(valueRef.current, fieldObject);
        if (rootResult.status === 'applied') {
          onChangeRef.current(rootResult.yaml);
        } else {
          toasts.addWarning(i18n.ACTIONS_MENU_INVALID_YAML);
        }
        closeAndFocusEditor();
        return;
      }
      const result = insertTemplateField(valueRef.current, fieldObject, cursorLineRef.current);
      if (result.changed) {
        onChangeRef.current(result.yaml);
      } else if (result.reason === 'invalid') {
        toasts.addWarning(i18n.ACTIONS_MENU_INVALID_YAML);
      } else {
        toasts.addWarning(i18n.ACTIONS_MENU_FIELD_EXISTS(displayName));
      }
      closeAndFocusEditor();
    },
    [closeAndFocusEditor, toasts, mode]
  );

  const linkLibraryField = useCallback(
    (fieldName: string) => insertField({ $ref: fieldName }, fieldName),
    [insertField]
  );

  const applyRule = useCallback(
    (action: FieldRuleAction) => {
      const result =
        mode === 'fieldDefinition'
          ? applyRootFieldBlock(valueRef.current, action.blockKey, action.ruleKey, action.value)
          : applyFieldBlock(
              valueRef.current,
              cursorLineRef.current,
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
    [closeAndFocusEditor, toasts, mode]
  );

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(() => {
    const isFieldDefinition = mode === 'fieldDefinition';
    const hasTargetField = targetField != null;
    const validationActions = hasTargetField ? getValidationActions(targetField.control) : [];
    const conditionalActions = hasTargetField ? getConditionalLogicActions() : [];
    // A field can only be added/edited when the buffer is re-serializable.
    const insertDisabledHint = bufferHasErrors ? i18n.ACTIONS_MENU_FIX_YAML_FIRST : undefined;
    // Validation / Conditional need a valid buffer and a target field — the field under the cursor,
    // or (fieldDefinition mode, where cursor position is meaningless) the root field itself.
    const ruleDisabledHint = bufferHasErrors
      ? i18n.ACTIONS_MENU_FIX_YAML_FIRST
      : isFieldDefinition
      ? i18n.ACTIONS_MENU_NO_FIELD_YET
      : i18n.ACTIONS_MENU_SELECT_A_FIELD;
    // In fieldDefinition mode picking a type replaces the whole (single-field) document, so once a
    // field exists the section reads "Change field type" instead of "New field".
    const newFieldTitle =
      isFieldDefinition && hasTargetField
        ? i18n.ACTION_CHANGE_FIELD_TYPE_TITLE
        : i18n.ACTION_NEW_FIELD_TITLE;
    const newFieldDesc =
      isFieldDefinition && hasTargetField
        ? i18n.ACTION_CHANGE_FIELD_TYPE_DESC
        : i18n.ACTION_NEW_FIELD_DESC;

    return [
      {
        id: PANEL_IDS.root,
        title: i18n.ACTIONS_MENU_ROOT_TITLE,
        items: [
          {
            name: (
              <MenuItemLabel
                title={newFieldTitle}
                description={bufferHasErrors ? i18n.ACTIONS_MENU_FIX_YAML_FIRST : newFieldDesc}
              />
            ),
            panel: PANEL_IDS.newField,
            disabled: bufferHasErrors,
            toolTipContent: insertDisabledHint,
            'data-test-subj': `${testSubjPrefix}-newField`,
          },
          // A definition cannot reference another definition (no `$ref` at the field-library root),
          // so the Field library section only exists for templates.
          ...(isFieldDefinition
            ? []
            : [
                {
                  name: (
                    <MenuItemLabel
                      title={i18n.ACTION_FIELD_LIBRARY_TITLE}
                      description={
                        bufferHasErrors
                          ? i18n.ACTIONS_MENU_FIX_YAML_FIRST
                          : i18n.ACTION_FIELD_LIBRARY_DESC
                      }
                    />
                  ),
                  panel: PANEL_IDS.fieldLibrary,
                  disabled: bufferHasErrors,
                  toolTipContent: insertDisabledHint,
                  'data-test-subj': `${testSubjPrefix}-fieldLibrary`,
                },
              ]),
          {
            // When disabled, the reason replaces the description so it is both visible AND part of
            // the item's accessible name (a hover-only tooltip is unreachable by keyboard/SR users).
            name: (
              <MenuItemLabel
                title={i18n.ACTION_VALIDATION_TITLE}
                description={hasTargetField ? i18n.ACTION_VALIDATION_DESC : ruleDisabledHint}
              />
            ),
            panel: PANEL_IDS.validation,
            disabled: !hasTargetField,
            toolTipContent: hasTargetField ? undefined : ruleDisabledHint,
            'data-test-subj': `${testSubjPrefix}-validation`,
          },
          // Conditional rules reference sibling fields, which only exist once the field is placed in
          // a template — so the section is omitted for a standalone definition.
          ...(isFieldDefinition
            ? []
            : [
                {
                  name: (
                    <MenuItemLabel
                      title={i18n.ACTION_CONDITIONAL_TITLE}
                      description={hasTargetField ? i18n.ACTION_CONDITIONAL_DESC : ruleDisabledHint}
                    />
                  ),
                  panel: PANEL_IDS.conditional,
                  disabled: !hasTargetField,
                  toolTipContent: hasTargetField ? undefined : ruleDisabledHint,
                  'data-test-subj': `${testSubjPrefix}-conditional`,
                },
              ]),
        ],
      },
      {
        id: PANEL_IDS.newField,
        title: newFieldTitle,
        items: NEW_FIELD_ITEMS.map((item) => ({
          name: <MenuItemLabel title={item.label} description={item.description} />,
          onClick: () => {
            const scaffold = buildFieldScaffold(item.control);
            if (scaffold) {
              insertField(scaffold, item.label);
            }
          },
          'data-test-subj': `${testSubjPrefix}-newField-${item.control}`,
        })),
      },
      ...(isFieldDefinition
        ? []
        : [
            {
              id: PANEL_IDS.fieldLibrary,
              title: i18n.ACTION_FIELD_LIBRARY_TITLE,
              // Rendered lazily (the whole menu only mounts while open), so the library query does
              // not run until the author opens the Actions menu.
              content: (
                <FieldLibraryMenuPanel
                  owner={owner}
                  existingYaml={value}
                  onSelect={linkLibraryField}
                  width={PANEL_WIDTH}
                />
              ),
            },
          ]),
      {
        id: PANEL_IDS.validation,
        title: i18n.ACTION_VALIDATION_TITLE,
        items: validationActions.map((action) => ({
          name: action.label,
          onClick: () => applyRule(action),
          'data-test-subj': `${testSubjPrefix}-validation-${action.id}`,
        })),
      },
      ...(isFieldDefinition
        ? []
        : [
            {
              id: PANEL_IDS.conditional,
              title: i18n.ACTION_CONDITIONAL_TITLE,
              items: conditionalActions.map((action) => ({
                name: action.label,
                onClick: () => applyRule(action),
                'data-test-subj': `${testSubjPrefix}-conditional-${action.id}`,
              })),
            },
          ]),
    ];
  }, [
    mode,
    testSubjPrefix,
    targetField,
    bufferHasErrors,
    owner,
    value,
    linkLibraryField,
    insertField,
    applyRule,
  ]);

  return (
    <div
      css={css({
        position: 'absolute',
        bottom: euiTheme.size.s,
        // Clear Monaco's vertical scrollbar so the trigger never sits on top of it.
        right: euiTheme.size.l,
        zIndex: 1,
      })}
    >
      <EuiPopover
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        panelPaddingSize="none"
        anchorPosition="upRight"
        button={
          // A bordered, filled chip (matching the editor's "Draft saved" indicator) so the trigger
          // reads as clickable over the code rather than as inline text.
          <EuiButtonEmpty
            size="xs"
            color="text"
            iconType="plusInCircle"
            iconSide="left"
            onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
            aria-label={`${i18n.ACTIONS_MENU_ARIA} (${SHORTCUT_HINT})`}
            data-test-subj={`${testSubjPrefix}Button`}
            css={css({
              backgroundColor: euiTheme.colors.backgroundBasePlain,
              border: `1px solid ${euiTheme.colors.borderBasePlain}`,
              borderRadius: euiTheme.border.radius.medium,
            })}
          >
            {i18n.ACTIONS_MENU_BUTTON}
            <EuiCode
              transparentBackground
              css={css({
                marginInlineStart: euiTheme.size.s,
                color: euiTheme.colors.textSubdued,
              })}
            >
              {SHORTCUT_HINT}
            </EuiCode>
          </EuiButtonEmpty>
        }
      >
        {isOpen ? (
          <EuiContextMenu
            initialPanelId={PANEL_IDS.root}
            panels={panels}
            data-test-subj={`${testSubjPrefix}Panels`}
            // Cap the height so long panels (e.g. the 10 field types) scroll instead of running past
            // the viewport; the shared width stops the panels resize-jumping as you drill in.
            css={css({ width: PANEL_WIDTH, maxHeight: '60vh', overflowY: 'auto' })}
          />
        ) : null}
      </EuiPopover>
    </div>
  );
};

TemplateActionsMenu.displayName = 'TemplateActionsMenu';
