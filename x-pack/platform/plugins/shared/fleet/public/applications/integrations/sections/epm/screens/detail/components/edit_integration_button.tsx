/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';

interface EditIntegrationButtonProps {
  onClick: Function;
}
export function EditIntegrationButton(props: EditIntegrationButtonProps) {
  const { onClick } = props;
  return (
    <EuiButtonEmpty
      onClick={(e: React.MouseEvent) => onClick(e)}
      iconType="pencil"
      aria-label="Edit"
    />
  );
}
