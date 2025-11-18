/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FieldDefinitionConfig } from '@kbn/streams-schema';
import { FieldNameWithIcon } from '@kbn/react-field';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiToken } from '@elastic/eui';
import { FIELD_TYPE_MAP } from './constants';

export const FieldType = ({
  type,
  aliasFor,
}: {
  type: FieldDefinitionConfig['type'];
  aliasFor?: string;
}) => {
  if (aliasFor) {
    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToken iconType="tokenAlias" aria-label="alias" />
        </EuiFlexItem>
        <EuiFlexItem>
          {i18n.translate('xpack.streams.fieldType.aliasFor', {
            defaultMessage: 'Alias for {aliasFor}',
            values: { aliasFor },
          })}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Handle unknown types gracefully - if type is not in FIELD_TYPE_MAP, show the type name directly
  // for eg. object, nested, geo_point, binary, etc
  const typeInfo = FIELD_TYPE_MAP[type as keyof typeof FIELD_TYPE_MAP];
  if (!typeInfo) {
    return <FieldNameWithIcon name={type} type={type !== 'system' ? type : undefined} />;
  }

  return <FieldNameWithIcon name={typeInfo.label} type={type !== 'system' ? type : undefined} />;
};
