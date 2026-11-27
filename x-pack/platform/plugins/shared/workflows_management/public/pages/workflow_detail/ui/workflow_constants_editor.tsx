/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  SettingsEntriesEditor,
  type SettingsEntriesEditorConfig,
  type SettingsEntriesEditorProps,
} from './settings_entries_editor';
import { SettingsEntryRow } from './settings_entry_row';
import { type ConstantField, createEmptyConstant } from './workflow_settings_fields_model';

export type WorkflowConstantsEditorProps = SettingsEntriesEditorProps<ConstantField>;

const CONFIG: SettingsEntriesEditorConfig<ConstantField> = {
  testSubjPrefix: 'workflowSettingsConst',
  namePrefix: 'constant_',
  createEmpty: (name) => createEmptyConstant({ name }),
  confirmUnreferencedRename: false,
  renderDraftRow: ({ field, siblings, readOnly, onCommit, onDiscard }) => (
    <SettingsEntryRow
      kind="constant"
      mode="draft"
      field={field}
      siblings={siblings}
      readOnly={readOnly}
      onCommit={onCommit}
      onDiscard={onDiscard}
    />
  ),
  renderRow: ({ field, siblings, readOnly, onChange, onRequestDelete }) => (
    <SettingsEntryRow
      kind="constant"
      mode="committed"
      field={field}
      siblings={siblings}
      readOnly={readOnly}
      onChange={onChange}
      onRequestDelete={onRequestDelete}
    />
  ),
};

export function WorkflowConstantsEditor(props: WorkflowConstantsEditorProps) {
  return (
    <SettingsEntriesEditor
      {...props}
      config={CONFIG}
      labels={{
        add: i18n.translate('workflows.workflowSettingsFlyout.addConstant', {
          defaultMessage: 'Add constant',
        }),
        emptyTitle: i18n.translate('workflows.workflowSettingsFlyout.noConstantsTitle', {
          defaultMessage: 'No constants yet',
        }),
        emptyBody: i18n.translate('workflows.workflowSettingsFlyout.noConstantsBody', {
          defaultMessage:
            'Constants are fixed values reused across steps — a channel name, an API base URL, a case owner. They are stored in the workflow definition and visible to anyone who can edit it. Reference them as {reference}.',
          values: { reference: 'consts.<name>' },
        }),
        deleteTitle: (name) =>
          i18n.translate('workflows.workflowSettingsFlyout.deleteConstTitle', {
            defaultMessage: 'Delete constant “{name}”?',
            values: { name },
          }),
        deleteBody: (steps) =>
          i18n.translate('workflows.workflowSettingsFlyout.deleteConstBody', {
            defaultMessage:
              'This constant is referenced by: {steps}. Deleting it may break those steps.',
            values: { steps: steps.join(', ') },
          }),
        renameTitle: i18n.translate('workflows.workflowSettingsFlyout.renameConstTitle', {
          defaultMessage: 'Rename constant?',
        }),
        renameBody: (name, steps) =>
          i18n.translate('workflows.workflowSettingsFlyout.renameConstBody', {
            defaultMessage:
              '“{name}” is referenced by: {steps}. Update those steps after renaming.',
            values: { name, steps: steps.join(', ') },
          }),
      }}
    />
  );
}
