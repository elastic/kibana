/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  KuiEmptyTablePromptPanel,
  KuiTableInfo
} from '@kbn/ui-framework/components';

export function MonitoringTableNoData({ message }) {
  return (
    <KuiEmptyTablePromptPanel data-test-subj="monitoringTableNoData">
      <KuiTableInfo>
        { message }
      </KuiTableInfo>
    </KuiEmptyTablePromptPanel>
  );
}
