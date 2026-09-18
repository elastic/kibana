/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';

import type { DatasetFormatFormValue } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import { PresetComboBoxField } from '../create_dataset_flyout/preset_combo_box_field';
import {
  getMappingDateFormatFieldConfig,
  getMappingDateFormatFieldHelpText,
} from './mapping_date_format_field_config';

export interface MappingDateFormatPresetFieldProps {
  value: string;
  onChange: (nextValue: string) => void;
  format: DatasetFormatFormValue;
  'data-test-subj': string;
}

export const MappingDateFormatPresetField: FunctionComponent<MappingDateFormatPresetFieldProps> = ({
  value,
  onChange,
  format,
  'data-test-subj': dataTestSubj,
}) => {
  const config = getMappingDateFormatFieldConfig(format);

  return (
    <PresetComboBoxField
      value={value}
      onChange={onChange}
      label={config.label}
      helpText={getMappingDateFormatFieldHelpText(config)}
      placeholder={config.placeholder}
      presets={config.presets}
      defaultPresetValue={config.defaultPresetValue}
      isCompressed={false}
      data-test-subj={dataTestSubj}
    />
  );
};
