/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { PrototypeTableStateSwitcher } from './prototype_table_state_switcher';
import { PrototypeVersionSwitcher } from './prototype_version_switcher';

export const PrototypeBreadcrumbExtensions: React.FunctionComponent = () => (
  <div
    css={css`
      display: flex;
      align-items: center;
      gap: 12px;
      padding-left: 12px;
    `}
  >
    <PrototypeTableStateSwitcher />
    <PrototypeVersionSwitcher />
  </div>
);
