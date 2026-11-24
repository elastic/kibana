/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHighlight } from '@elastic/eui';
import React from 'react';
import { FieldIcon } from '@kbn/react-field';

interface FieldNameProps {
  fieldName: string;
  fieldType: string;
  highlight?: string;
}

export const FieldName = React.memo<FieldNameProps>(({ fieldName, fieldType, highlight = '' }) => (
  <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
    <EuiFlexItem grow={false}>
      <FieldIcon type={fieldType} size="s" />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiHighlight search={highlight}>{fieldName}</EuiHighlight>
    </EuiFlexItem>
  </EuiFlexGroup>
));
FieldName.displayName = 'FieldName';
