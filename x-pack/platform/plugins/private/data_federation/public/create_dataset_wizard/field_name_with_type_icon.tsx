/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { getFieldTypeName } from '@kbn/field-utils';
import { FieldIcon } from '@kbn/react-field';

import { normalizeFieldTypeForIcon } from './field_type_icon_type';

export const FieldNameWithTypeIcon: FunctionComponent<{
  name: string;
  type?: string;
}> = ({ name, type }) => {
  if (!type) {
    return name;
  }

  const typeName = getFieldTypeName(type);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={typeName} disableScreenReaderOutput>
          <FieldIcon type={normalizeFieldTypeForIcon(type)} label={typeName} title="" />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{name}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
