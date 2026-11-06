/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import { FormRow } from './fields';

interface TemplateFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const EDITOR_HEIGHT = 320;

/** HTML and CSS with Liquid tags, in the editor custom content panels use. */
export const TemplateField = ({ value, onChange }: TemplateFieldProps) => (
  <FormRow
    fullWidth
    label={i18n.translate('xpack.customApp.editor.fieldTemplate', {
      defaultMessage: 'Template',
    })}
    helpText={i18n.translate('xpack.customApp.editor.templateHelp', {
      defaultMessage:
        'HTML and CSS, with Liquid tags to insert the rows of the query. For each row, row["column"].value is the value and row["column"].pct its percentage of the highest value in the column.',
    })}
  >
    <div data-test-subj="customAppTemplateEditor">
      <CodeEditor
        languageId="liquid"
        value={value}
        onChange={onChange}
        height={EDITOR_HEIGHT}
        aria-label={i18n.translate('xpack.customApp.editor.templateEditorLabel', {
          defaultMessage: 'Template editor',
        })}
        options={{
          fontSize: 12,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          lineNumbers: 'on',
          folding: true,
        }}
      />
    </div>
  </FormRow>
);
