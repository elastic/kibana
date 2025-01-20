/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { ManualMitigations } from '../../possible_mitigations/manual';
import { PossibleMitigationTitle } from '../../possible_mitigations/title';

export function PossibleMitigations({ children }: { children?: React.ReactNode }) {
  return (
    <div>
      <EuiSpacer size="s" />
      <PossibleMitigationTitle />
      <EuiSpacer size="m" />
      {children}
      <ManualMitigations />
    </div>
  );
}
