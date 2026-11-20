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
  labelAppend?: React.ReactNode;
  helpText?: React.ReactNode;
}

/**
 * Where a form row shows its description and its choice links. A row that shares its line with
 * others keeps the label to one line and the description in a tooltip, so the inputs line up.
 */
export const toRowChrome = ({
  label,
  description,
  alternatives,
  compact,
}: {
  label: string;
  description?: string;
  /** Links that switch to another member of a choice group. */
  alternatives?: React.ReactNode;
  compact?: boolean;
}): RowChrome => {
  if (!compact) {
    return { label, labelAppend: alternatives, helpText: description };
  }
  return {
    label: description ? (
      <>
        {label} <EuiIconTip content={description} size="s" color="subdued" />
      </>
    ) : (
      label
    ),
    helpText: alternatives,
  };
};
