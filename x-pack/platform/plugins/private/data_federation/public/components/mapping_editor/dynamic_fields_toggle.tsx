/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiIconTip, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface DynamicFieldsToggleProps {
  checked: boolean;
  onChange: (nextChecked: boolean) => void;
}

export const DynamicFieldsToggle = ({ checked, onChange }: DynamicFieldsToggleProps) => {
  return (
    <EuiFormRow
      helpText={i18n.translate('xpack.dataFederation.mappingEditor.dynamicDescription', {
        defaultMessage: 'Dynamic fields will be inferred at query time if not mapped.',
      })}
      fullWidth
    >
      <EuiSwitch
        name="dataFederationMappingEditorDynamic"
        label={
          <>
            {i18n.translate('xpack.dataFederation.mappingEditor.dynamicLabel', {
              defaultMessage: 'Dynamic fields',
            })}{' '}
            <EuiIconTip
              content={i18n.translate('xpack.dataFederation.mappingEditor.dynamicHelp', {
                defaultMessage:
                  'When enabled, undeclared columns are included (schema inference overlays your declared fields). Disable to treat your declaration as the complete schema.',
              })}
              position="right"
            />
          </>
        }
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-test-subj="dataFederationMappingEditorDynamic"
      />
    </EuiFormRow>
  );
};

