/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiSwitch } from '@elastic/eui';

interface UseIdAsIndexNameSwitchProps {
  destIndexSameAsId: boolean;
  isJobCreated: boolean;
  setDestIndexSameAsId: (d: boolean) => void;
  label: string;
}

export const UseIdAsIndexNameSwitch: FC<UseIdAsIndexNameSwitchProps> = ({
  destIndexSameAsId,
  isJobCreated,
  setDestIndexSameAsId,
  label,
}) => (
  <EuiSwitch
    disabled={isJobCreated}
    name="mlCreationWizardUtilsJobIdAsDestIndexName"
    label={label}
    checked={destIndexSameAsId === true}
    onChange={() => setDestIndexSameAsId(!destIndexSameAsId)}
    data-test-subj="mlCreationWizardUtilsJobIdAsDestIndexNameSwitch"
  />
);
