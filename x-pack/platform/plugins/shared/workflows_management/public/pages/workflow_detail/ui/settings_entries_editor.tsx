/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { SettingsEntryListHost } from './settings_entry_row';

export interface SettingsEditorAddControls {
  readonly onAdd: () => void;
  readonly disabled: boolean;
}

interface SettingsEntry {
  readonly id: string;
  readonly name: string;
}

export interface SettingsEntriesEditorProps<T extends SettingsEntry> {
  readonly fields: readonly T[];
  readonly onChange: (next: readonly T[]) => void;
  readonly findReferencingSteps?: (name: string) => string[];
  readonly readOnly?: boolean;
  /**
   * When this value changes, any uncommitted draft row is discarded silently
   * (e.g. Option C popover collapse).
   */
  readonly discardDraftSignal?: number;
  /**
   * Hide the in-content Add CTA (and empty-state action). Use with
   * {@link onAddControlsChange} to place Add on an accordion header row.
   */
  readonly hideInlineAddButton?: boolean;
  /** Publishes Add controls for an external CTA (accordion `extraAction`). */
  readonly onAddControlsChange?: (controls: SettingsEditorAddControls | null) => void;
}

/** Stable per-kind configuration: must be a module-level constant. */
export interface SettingsEntriesEditorConfig<T extends SettingsEntry> {
  /** Prefix of the `data-test-subj` values (`<prefix>Add`, `<prefix>Empty`) and of the modal title ids. */
  readonly testSubjPrefix: string;
  /** New draft names are `<namePrefix><n>`. */
  readonly namePrefix: string;
  readonly createEmpty: (name: string) => T;
  /** Ask for rename confirmation even when no step references the entry. */
  readonly confirmUnreferencedRename: boolean;
  readonly renderDraftRow: (row: {
    readonly field: T;
    readonly siblings: readonly T[];
    readonly readOnly: boolean;
    readonly onCommit: (next: T) => void;
    readonly onDiscard: () => void;
  }) => React.ReactElement;
  readonly renderRow: (row: {
    readonly field: T;
    readonly siblings: readonly T[];
    readonly readOnly: boolean;
    readonly onChange: (next: T) => void;
    readonly onRequestDelete: () => void;
  }) => React.ReactElement;
}

export interface SettingsEntriesEditorLabels {
  readonly add: string;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly deleteTitle: (name: string) => string;
  readonly deleteBody: (steps: string[]) => string;
  readonly renameTitle: string;
  readonly renameBody: (name: string, steps: string[]) => string;
}

export function SettingsEntriesEditor<T extends SettingsEntry>({
  config,
  labels,
  fields,
  onChange,
  findReferencingSteps,
  readOnly = false,
  discardDraftSignal,
  hideInlineAddButton = false,
  onAddControlsChange,
}: SettingsEntriesEditorProps<T> & {
  readonly config: SettingsEntriesEditorConfig<T>;
  readonly labels: SettingsEntriesEditorLabels;
}) {
  const { testSubjPrefix } = config;
  const deleteModalTitleId = useGeneratedHtmlId({ prefix: `${testSubjPrefix}DeleteTitle` });
  const renameModalTitleId = useGeneratedHtmlId({ prefix: `${testSubjPrefix}RenameTitle` });
  const [draftField, setDraftField] = useState<T | null>(null);

  useEffect(() => {
    if (discardDraftSignal === undefined) return;
    setDraftField(null);
  }, [discardDraftSignal]);
  const [pendingDelete, setPendingDelete] = useState<{
    field: T;
    steps: string[];
  } | null>(null);
  const [pendingRename, setPendingRename] = useState<{
    field: T;
    nextName: string;
    steps: string[];
  } | null>(null);

  const handleAdd = useCallback(() => {
    if (draftField || readOnly) return;
    const nextIndex = fields.length + 1;
    setDraftField(config.createEmpty(`${config.namePrefix}${nextIndex}`));
  }, [config, draftField, fields.length, readOnly]);

  useEffect(() => {
    if (!onAddControlsChange) return undefined;
    onAddControlsChange(readOnly ? null : { onAdd: handleAdd, disabled: draftField != null });
    return () => onAddControlsChange(null);
  }, [onAddControlsChange, readOnly, handleAdd, draftField]);

  const commitDelete = useCallback(
    (field: T) => {
      onChange(fields.filter((f) => f.id !== field.id));
      setPendingDelete(null);
    },
    [fields, onChange]
  );

  const requestDelete = useCallback(
    (field: T) => {
      const steps = field.name.trim() ? findReferencingSteps?.(field.name.trim()) ?? [] : [];
      if (steps.length > 0) {
        setPendingDelete({ field, steps });
        return;
      }
      commitDelete(field);
    },
    [commitDelete, findReferencingSteps]
  );

  const handleUpdate = useCallback(
    (next: T) => {
      const prev = fields.find((f) => f.id === next.id);
      if (prev && prev.name.trim() && next.name.trim() && prev.name.trim() !== next.name.trim()) {
        const steps = findReferencingSteps?.(prev.name.trim()) ?? [];
        if (steps.length > 0 || config.confirmUnreferencedRename) {
          setPendingRename({ field: next, nextName: next.name, steps });
          onChange(fields.map((f) => (f.id === next.id ? { ...next, name: prev.name } : f)));
          return;
        }
      }
      onChange(fields.map((f) => (f.id === next.id ? next : f)));
    },
    [config, fields, findReferencingSteps, onChange]
  );

  const commitDraft = useCallback(
    (next: T) => {
      onChange([...fields, next]);
      setDraftField(null);
    },
    [fields, onChange]
  );

  const addButton =
    readOnly || hideInlineAddButton ? null : (
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            flush="both"
            color="primary"
            iconType="plusCircle"
            onClick={handleAdd}
            isDisabled={draftField != null}
            data-test-subj={`${testSubjPrefix}Add`}
          >
            {labels.add}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

  if (fields.length === 0 && !draftField) {
    return (
      <EuiEmptyPrompt
        title={<h3>{labels.emptyTitle}</h3>}
        titleSize="xs"
        body={
          <EuiText size="s">
            <p>{labels.emptyBody}</p>
          </EuiText>
        }
        actions={
          readOnly || hideInlineAddButton ? undefined : (
            <EuiButtonEmpty
              size="s"
              iconType="plusCircle"
              onClick={handleAdd}
              data-test-subj={`${testSubjPrefix}Add`}
            >
              {labels.add}
            </EuiButtonEmpty>
          )
        }
        data-test-subj={`${testSubjPrefix}Empty`}
      />
    );
  }

  return (
    <>
      {addButton}
      {addButton ? <EuiSpacer size="s" /> : null}
      <SettingsEntryListHost
        fields={fields}
        draftRow={
          draftField
            ? config.renderDraftRow({
                field: draftField,
                siblings: fields,
                readOnly,
                onCommit: commitDraft,
                onDiscard: () => setDraftField(null),
              })
            : null
        }
        renderRow={(field) =>
          config.renderRow({
            field,
            siblings: fields,
            readOnly,
            onChange: handleUpdate,
            onRequestDelete: () => requestDelete(field),
          })
        }
      />

      {pendingDelete ? (
        <EuiConfirmModal
          aria-labelledby={deleteModalTitleId}
          titleProps={{ id: deleteModalTitleId }}
          title={labels.deleteTitle(pendingDelete.field.name)}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => commitDelete(pendingDelete.field)}
          cancelButtonText={i18n.translate('workflows.workflowSettingsFlyout.cancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('workflows.workflowSettingsFlyout.delete', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
          defaultFocusedButton="cancel"
        >
          <EuiText size="s">{labels.deleteBody(pendingDelete.steps)}</EuiText>
        </EuiConfirmModal>
      ) : null}

      {pendingRename ? (
        <EuiConfirmModal
          aria-labelledby={renameModalTitleId}
          titleProps={{ id: renameModalTitleId }}
          title={labels.renameTitle}
          onCancel={() => setPendingRename(null)}
          onConfirm={() => {
            onChange(
              fields.map((f) =>
                f.id === pendingRename.field.id
                  ? { ...pendingRename.field, name: pendingRename.nextName }
                  : f
              )
            );
            setPendingRename(null);
          }}
          cancelButtonText={i18n.translate('workflows.workflowSettingsFlyout.cancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('workflows.workflowSettingsFlyout.rename', {
            defaultMessage: 'Rename',
          })}
          defaultFocusedButton="cancel"
        >
          <EuiText size="s">
            {labels.renameBody(
              fields.find((f) => f.id === pendingRename.field.id)?.name ?? '',
              pendingRename.steps
            )}
          </EuiText>
        </EuiConfirmModal>
      ) : null}
    </>
  );
}
