/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';

interface RowChrome {
  label: React.ReactNode;
  helpText?: React.ReactNode;
}

/**
 * Where a form row shows its description. A row that shares its line with
 * others keeps the label to one line and the description in a tooltip, so the inputs line up.
 */
export const toRowChrome = ({
  label,
  description,
  compact,
}: {
  label: string;
  description?: string;
  compact?: boolean;
}): RowChrome => {
  if (!compact) {
    return { label, helpText: description };
  }
  return {
    label: description ? (
      <>
        {label} <EuiIconTip content={description} size="s" color="subdued" />
      </>
    ) : (
      label
    ),
  };
};
