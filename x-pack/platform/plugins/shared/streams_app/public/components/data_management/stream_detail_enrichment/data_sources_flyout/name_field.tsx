/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiFieldText, EuiFieldTextProps } from '@elastic/eui';
import { DATA_SOURCES_I18N } from './translations';

export const NameField = (props: Omit<EuiFieldTextProps, 'name'>) => {
  return (
    <EuiFormRow
      fullWidth
      label={DATA_SOURCES_I18N.nameField.label}
      helpText={DATA_SOURCES_I18N.nameField.helpText}
    >
      <EuiFieldText fullWidth name="name" {...props} />
    </EuiFormRow>
  );
};
