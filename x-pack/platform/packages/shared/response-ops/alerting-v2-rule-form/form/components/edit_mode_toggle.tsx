/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type EditMode = 'form' | 'yaml';

interface EditModeToggleProps {
  editMode: EditMode;
  onChange: (mode: EditMode) => void;
  disabled?: boolean;
}

const toggleButtons = [
  {
    id: 'form',
    label: i18n.translate('xpack.alertingV2.ruleForm.editMode.form', {
      defaultMessage: 'Form',
    }),
    'data-test-subj': 'ruleV2FormEditModeFormButton',
  },
  {
    id: 'yaml',
    label: i18n.translate('xpack.alertingV2.ruleForm.editMode.yaml', {
      defaultMessage: 'YAML',
    }),
    'data-test-subj': 'ruleV2FormEditModeYamlButton',
  },
];

export const EditModeToggle = ({ editMode, onChange, disabled }: EditModeToggleProps) => {
  const handleChange = (optionId: string) => {
    onChange(optionId as EditMode);
  };

  return (
    <EuiButtonGroup
      legend={i18n.translate('xpack.alertingV2.ruleForm.editMode.legend', {
        defaultMessage: 'Edit mode selection',
      })}
      options={toggleButtons}
      idSelected={editMode}
      onChange={handleChange}
      buttonSize="compressed"
      isFullWidth={false}
      isDisabled={disabled}
      data-test-subj="ruleV2FormEditModeToggle"
    />
  );
};
