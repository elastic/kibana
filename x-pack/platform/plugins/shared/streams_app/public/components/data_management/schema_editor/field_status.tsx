/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { FieldStatus } from './constants';
import { FIELD_STATUS_MAP } from './constants';

export const FieldStatusBadge = ({ status }: { status: FieldStatus }) => {
  return (
    <EuiToolTip content={FIELD_STATUS_MAP[status].tooltip}>
      <EuiBadge tabIndex={0} color={FIELD_STATUS_MAP[status].color}>
        {FIELD_STATUS_MAP[status].label}
      </EuiBadge>
    </EuiToolTip>
  );
};
