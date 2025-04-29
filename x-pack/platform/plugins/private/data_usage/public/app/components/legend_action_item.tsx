/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiListGroupItem } from '@elastic/eui';

export const LegendActionItem = memo(
  ({
    label,
    onClick,
    dataTestSubj,
  }: {
    label: string;
    onClick: () => Promise<void> | void;
    dataTestSubj: string;
  }) => <EuiListGroupItem label={label} onClick={onClick} data-test-subj={dataTestSubj} size="s" />
);

LegendActionItem.displayName = 'LegendActionItem';
