/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiCheckbox, EuiFlexItem, htmlIdGenerator } from '@elastic/eui';

interface Props {
  id: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TimeseriesExplorerCheckbox: FC<Props> = ({ id, label, checked, onChange }) => {
  const checkboxId = useMemo(() => `${id}-${htmlIdGenerator()()}`, [id]);
  return (
    <EuiFlexItem grow={false}>
      <EuiCheckbox id={checkboxId} label={label} checked={checked} onChange={onChange} />
    </EuiFlexItem>
  );
};
