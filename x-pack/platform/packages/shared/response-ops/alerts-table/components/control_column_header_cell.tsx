/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL } from '../translations';

export const ControlColumnHeaderCell = memo(() => {
  return (
    <span data-test-subj="expandColumnHeaderLabel">
      {ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL}
    </span>
  );
});
