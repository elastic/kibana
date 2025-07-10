/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';

interface EditIntegrationButtonProps {
  handleEditIntegrationClick: Function;
}
export function EditIntegrationButton(props: EditIntegrationButtonProps) {
  const { handleEditIntegrationClick } = props;
  return (
    <EuiButton
      onClick={(e: React.MouseEvent) => handleEditIntegrationClick(e)}
      iconType="pencil"
      aria-label="Edit"
    />
  );
}
