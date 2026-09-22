/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';

import { possibleMitigationTitle } from '../../../../../../common/translations';

export function PossibleMitigationTitle() {
  return (
    <EuiTitle
      size="xs"
      data-test-subj="datasetQualityDetailsDegradedFieldFlyoutPossibleMitigationTitle"
    >
      <p>{possibleMitigationTitle}</p>
    </EuiTitle>
  );
}
