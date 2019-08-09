/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiText, EuiTextColor, EuiFlexItem, EuiFlexGroup, EuiBadge } from '@elastic/eui';

interface Props {
  name: string;
  property: Record<string, any>;
}

export const PropertyView = ({ name, property }: Props) => {
  const badges = (
    <Fragment>
      {['index', 'doc_values', 'store', 'fielddata']
        .filter(field => Boolean(property[field]))
        .map((field, i) => (
          <EuiFlexItem key={i} grow={false}>
            <EuiBadge color="hollow">{field}</EuiBadge>
          </EuiFlexItem>
        ))}
    </Fragment>
  );

  return (
    <EuiFlexGroup alignItems="center">
      {/* Name & Type */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem>
            <EuiText>{name}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTextColor color="subdued">
              <EuiText size="s">({property.type})</EuiText>
            </EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Badges */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs">{badges}</EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
