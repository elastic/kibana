/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFieldText, EuiForm, EuiFormRow } from '@elastic/eui';
import React from 'react';
import { IndexEntry } from '@kbn/elastic-assistant-common';
import * as i18n from './translations';

interface Props {
  entry?: IndexEntry;
}

export const IndexEntryEditor: React.FC<Props> = React.memo(({ entry }) => {
  return (
    <EuiForm>
      <EuiFormRow label={i18n.ENTRY_NAME_INPUT_LABEL} fullWidth>
        <EuiFieldText
          name="name"
          placeholder={i18n.ENTRY_NAME_INPUT_PLACEHOLDER}
          fullWidth
          value={entry?.name}
        />
      </EuiFormRow>
      <EuiFormRow label={i18n.ENTRY_SPACE_INPUT_LABEL} fullWidth>
        <EuiComboBox
          aria-label={i18n.ENTRY_SPACE_INPUT_LABEL}
          placeholder={i18n.ENTRY_SPACE_INPUT_PLACEHOLDER}
          isClearable={true}
          isCaseSensitive
          fullWidth
          selectedOptions={
            entry?.namespace
              ? [
                  {
                    label: entry?.namespace,
                    value: entry?.namespace,
                  },
                ]
              : []
          }
        />
      </EuiFormRow>
      <EuiFormRow label={i18n.ENTRY_INDEX_NAME_INPUT_LABEL} fullWidth>
        <EuiComboBox
          aria-label={i18n.ENTRY_INDEX_NAME_INPUT_LABEL}
          placeholder={i18n.ENTRY_SPACE_INPUT_PLACEHOLDER}
          isClearable={true}
          isCaseSensitive
          fullWidth
          selectedOptions={
            entry?.index
              ? [
                  {
                    label: entry?.index,
                    value: entry?.index,
                  },
                ]
              : []
          }
        />
      </EuiFormRow>
      <EuiFormRow label={i18n.ENTRY_FIELD_INPUT_LABEL} fullWidth>
        <EuiFieldText
          name="field"
          placeholder={i18n.ENTRY_INPUT_PLACEHOLDER}
          fullWidth
          value={entry?.field}
        />
      </EuiFormRow>
      <EuiFormRow label={i18n.ENTRY_DESCRIPTION_INPUT_LABEL} fullWidth>
        <EuiFieldText
          name="description"
          placeholder={i18n.ENTRY_INPUT_PLACEHOLDER}
          fullWidth
          value={entry?.description}
        />
      </EuiFormRow>
    </EuiForm>
  );
});
IndexEntryEditor.displayName = 'IndexEntryEditor';
