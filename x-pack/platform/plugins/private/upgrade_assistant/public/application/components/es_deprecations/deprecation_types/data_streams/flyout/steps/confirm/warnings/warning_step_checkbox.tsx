/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCheckableCard } from '@elastic/eui';
import { DocLinksStart } from '@kbn/core/public';
import { EuiCode, EuiSpacer } from '@elastic/eui';

export const WarningCheckbox: React.FunctionComponent<{
  isChecked: boolean;
  warningId: string;
  description: React.ReactNode;
  label: React.ReactNode;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  dataStreamName?: string;
}> = ({ isChecked, warningId, label, onChange, description, dataStreamName }) => (
  <div data-test-subj="migrationWarningCheckbox">
    <EuiCheckableCard
      id={warningId}
      checkableType="checkbox"
      checked={isChecked}
      onChange={onChange}
      label={label}
    >
      {dataStreamName && (
        <p>
          Data stream: <EuiCode>{dataStreamName}</EuiCode>
        </p>
      )}
      <EuiSpacer size="s" />
      {description}
    </EuiCheckableCard>
  </div>
);

export interface WarningCheckboxProps {
  isChecked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  docLinks: DocLinksStart['links'];
  id: string;
  meta?: {
    oldestIncompatibleDocTimestamp?: number;
    indicesRequiringUpgradeCount?: number;
    dataStreamName?: string;
  };
}
