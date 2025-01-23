/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonRectangle, EuiSpacer } from '@elastic/eui';
import { useDatasetQualityDetailsState } from '../../../../../hooks';
import { CreateEditComponentTemplateLink } from './component_template_link';
import { CreateEditPipelineLink } from './pipeline_link';
import { otherMitigationsLoadingAriaText } from '../../../../../../common/translations';

export function ManualMitigations() {
  const {
    integrationDetails,
    loadingState: { integrationDetailsLoaded },
  } = useDatasetQualityDetailsState();
  const areIntegrationAssetsAvailable = !!integrationDetails?.integration?.areAssetsAvailable;

  return (
    <EuiSkeletonRectangle
      isLoading={!integrationDetailsLoaded}
      contentAriaLabel={otherMitigationsLoadingAriaText}
      width="100%"
      height={300}
      borderRadius="none"
      data-test-subj="datasetQualityDetailsFlyoutManualMitigationsLoading"
      className="datasetQualityDetailsFlyoutManualMitigationsLoading"
    >
      <CreateEditComponentTemplateLink
        areIntegrationAssetsAvailable={areIntegrationAssetsAvailable}
      />
      <EuiSpacer size="s" />
      <CreateEditPipelineLink areIntegrationAssetsAvailable={areIntegrationAssetsAvailable} />
    </EuiSkeletonRectangle>
  );
}
