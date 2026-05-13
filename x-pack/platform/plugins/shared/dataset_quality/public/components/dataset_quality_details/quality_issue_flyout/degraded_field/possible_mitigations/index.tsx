/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiHorizontalRule } from '@elastic/eui';
import { FieldMappingLimit } from './field_limit/field_mapping_limit';
import { useDatasetQualityDetailsState, useQualityIssues } from '../../../../../hooks';
import { ManualMitigations } from './manual';
import { PossibleMitigationTitle } from './title';
import { FieldCharacterLimit } from './field_character_limit/field_character_limit';
import { FieldMalformed } from './field_malformed/field_malformed';

export function PossibleDegradedFieldMitigations() {
  const { degradedFieldAnalysisFormattedResult, isAnalysisInProgress } = useQualityIssues();

  const isFieldLimitIssue = degradedFieldAnalysisFormattedResult?.isFieldLimitIssue ?? false;
  const isFieldCharacterLimitIssue =
    degradedFieldAnalysisFormattedResult?.isFieldCharacterLimitIssue ?? false;
  const isFieldMalformedIssue =
    degradedFieldAnalysisFormattedResult?.isFieldMalformedIssue ?? false;
  const { integrationDetails, view } = useDatasetQualityDetailsState();
  const areIntegrationAssetsAvailable = Boolean(
    integrationDetails?.integration?.areAssetsAvailable
  );

  return (
    !isAnalysisInProgress && (
      <div>
        <EuiHorizontalRule margin="m" />
        <PossibleMitigationTitle />
        <EuiSpacer size="m" />
        {isFieldLimitIssue && (
          <>
            <FieldMappingLimit areIntegrationAssetsAvailable={areIntegrationAssetsAvailable} />
            <EuiSpacer size="m" />
          </>
        )}
        {view !== 'dataQuality' && isFieldCharacterLimitIssue && (
          <>
            <FieldCharacterLimit />
          </>
        )}
        {view !== 'dataQuality' && isFieldMalformedIssue && (
          <>
            <FieldMalformed />
          </>
        )}
        {view !== 'wired' && <ManualMitigations />}
      </div>
    )
  );
}
