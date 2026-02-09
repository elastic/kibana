/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiText } from '@elastic/eui';
import React from 'react';

interface FormStyledLabelProps {
  text: string;
}

export const FormStyledLabel: React.FC<FormStyledLabelProps> = React.memo(({ text }) => (
  <EuiText size="xs">
    <strong>{text}</strong>
  </EuiText>
));
FormStyledLabel.displayName = 'FormStyledLabel';
