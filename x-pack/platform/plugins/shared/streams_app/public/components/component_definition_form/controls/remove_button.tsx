/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

export function RemoveButton({
  label,
  onClick,
  dataTestSubj,
}: {
  label: string;
  onClick: () => void;
  dataTestSubj: string;
}) {
  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="minusCircle"
        color="danger"
        aria-label={label}
        onClick={onClick}
        data-test-subj={dataTestSubj}
      />
    </EuiToolTip>
  );
}
