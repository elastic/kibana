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
import { createEmptyOutput, type OutputField } from './workflow_settings_fields_model';

export type WorkflowOutputsEditorProps = SettingsEntriesEditorProps<OutputField>;

const CONFIG: SettingsEntriesEditorConfig<OutputField> = {
  testSubjPrefix: 'workflowSettingsOutput',
  namePrefix: 'output_',
  createEmpty: (name) => createEmptyOutput({ name }),
  confirmUnreferencedRename: true,
  renderDraftRow: ({ field, siblings, readOnly, onCommit, onDiscard }) => (
    <SettingsEntryRow
      kind="output"
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
      kind="output"
      mode="committed"
      field={field}
      siblings={siblings}
      readOnly={readOnly}
      onChange={onChange}
      onRequestDelete={onRequestDelete}
    />
  ),
};

export function WorkflowOutputsEditor(props: WorkflowOutputsEditorProps) {
  return (
    <SettingsEntriesEditor
      {...props}
      config={CONFIG}
      labels={{
        add: i18n.translate('workflows.workflowSettingsFlyout.addOutput', {
          defaultMessage: 'Add output',
        }),
        emptyTitle: i18n.translate('workflows.workflowSettingsFlyout.noOutputsTitle', {
          defaultMessage: 'No outputs yet',
        }),
        emptyBody: i18n.translate('workflows.workflowSettingsFlyout.noOutputsBody', {
          defaultMessage:
            'Outputs are the public contract returned to calling workflows and API callers. Workflows that only act on other systems often need none.',
        }),
        deleteTitle: (name) =>
          i18n.translate('workflows.workflowSettingsFlyout.deleteOutputTitle', {
            defaultMessage: 'Delete output “{name}”?',
            values: { name },
          }),
        deleteBody: (steps) =>
          steps.length > 0
            ? i18n.translate('workflows.workflowSettingsFlyout.deleteOutputBodySteps', {
                defaultMessage:
                  'This output is referenced by: {steps}. External callers that depend on this key will also break.',
                values: { steps: steps.join(', ') },
              })
            : i18n.translate('workflows.workflowSettingsFlyout.deleteOutputBodyCallers', {
                defaultMessage:
                  'External callers that depend on this key may break after deletion.',
              }),
        renameTitle: i18n.translate('workflows.workflowSettingsFlyout.renameOutputTitle', {
          defaultMessage: 'Rename output?',
        }),
        renameBody: (name, steps) =>
          i18n.translate('workflows.workflowSettingsFlyout.renameOutputBody', {
            defaultMessage:
              'Renaming “{name}” breaks external callers that read this key{stepsSuffix}.',
            values: {
              name,
              stepsSuffix:
                steps.length > 0
                  ? i18n.translate('workflows.workflowSettingsFlyout.renameOutputStepsSuffix', {
                      defaultMessage: ', and is referenced by: {steps}',
                      values: { steps: steps.join(', ') },
                    })
                  : '',
            },
          }),
      }}
    />
  );
}
