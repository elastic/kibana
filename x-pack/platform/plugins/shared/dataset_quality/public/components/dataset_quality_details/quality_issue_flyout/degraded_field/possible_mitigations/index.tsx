/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FieldMappingLimit } from './field_limit/field_mapping_limit';
import { useDatasetQualityDetailsState, useQualityIssues } from '../../../../../hooks';
import { PossibleMitigations } from '../../possible_mitigations';

export function PossibleDegradedFieldMitigations() {
  const { degradedFieldAnalysis } = useQualityIssues();
  const { integrationDetails } = useDatasetQualityDetailsState();
  const areIntegrationAssetsAvailable = Boolean(
    integrationDetails?.integration?.areAssetsAvailable
  );

  return (
    <PossibleMitigations>
      {degradedFieldAnalysis?.isFieldLimitIssue && (
        <>
          <FieldMappingLimit areIntegrationAssetsAvailable={areIntegrationAssetsAvailable} />
          <EuiSpacer size="m" />
        </>
      )}
    </PossibleMitigations>
  );
}
