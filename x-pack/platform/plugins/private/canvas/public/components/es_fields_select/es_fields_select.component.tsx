/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FocusEventHandler } from 'react';
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
    />
  );
};
