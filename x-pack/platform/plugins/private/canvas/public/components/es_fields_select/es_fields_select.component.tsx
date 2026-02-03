/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FocusEventHandler } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox } from '@elastic/eui';

export interface ESFieldsSelectProps {
  value: string;
  onChange: (fields: string[]) => void;
  onBlur: FocusEventHandler<HTMLDivElement> | undefined;
  onFocus: FocusEventHandler<HTMLDivElement> | undefined;
  fields: string[];
  selected: string[];
}

export const ESFieldsSelect: React.FunctionComponent<ESFieldsSelectProps> = ({
  selected = [],
  fields = [],
  onChange,
  onFocus,
  onBlur,
}) => {
  const options = fields.map((value) => ({ label: value }));
  const selectedOptions = selected.map((value) => ({ label: value }));

  return (
    <EuiComboBox
      selectedOptions={selectedOptions}
      options={options}
      onChange={(values) => onChange(values.map(({ label }) => label))}
      className="canvasFieldsSelect"
      onFocus={onFocus}
      onBlur={onBlur}
      compressed
      aria-label={i18n.translate('xpack.canvas.esFieldsSelect.comboBoxAriaLabel', {
        defaultMessage: 'Elasticsearch fields',
      })}
    />
  );
};
