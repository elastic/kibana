/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIcon, EuiPanel, IconType } from '@elastic/eui';

export function IconPanel({ iconType }: { iconType: IconType }) {
  return (
    <EuiPanel className="iconPanel__panel">
      <EuiIcon type={iconType} size="original" />
    </EuiPanel>
  );
}
