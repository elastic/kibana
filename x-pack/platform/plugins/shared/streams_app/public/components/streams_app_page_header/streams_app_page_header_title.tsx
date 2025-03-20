/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

interface Props {
  title: React.ReactNode;
  description?: React.ReactNode;
}

export function StreamsAppPageHeaderTitle({ title, description }: Props) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>{title}</EuiFlexItem>
      {description && <EuiFlexItem>{description}</EuiFlexItem>}
    </EuiFlexGroup>
  );
}
