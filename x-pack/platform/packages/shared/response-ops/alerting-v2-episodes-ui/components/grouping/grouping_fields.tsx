/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

export interface AlertEpisodeGroupingFieldsProps {
  /** Field names from the rule's grouping configuration */
  fields: readonly string[];
  /** Shown when `fields` is empty; defaults to an em dash in subdued text */
  emptyDisplay?: React.ReactNode;
  'data-test-subj'?: string;
}

export function AlertEpisodeGroupingFields({
  fields,
  emptyDisplay,
  'data-test-subj': dataTestSubj,
}: AlertEpisodeGroupingFieldsProps) {
  if (fields.length === 0) {
    return (
      <span data-test-subj={dataTestSubj}>
        {emptyDisplay ?? (
          <EuiText size="s" color="subdued">
            —
          </EuiText>
        )}
      </span>
    );
  }

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false} data-test-subj={dataTestSubj}>
      {fields.map((field) => (
        <EuiFlexItem grow={false} key={field}>
          <EuiBadge color="hollow">{field}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
