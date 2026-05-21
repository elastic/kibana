/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { AwsCatalogIntegrationHeader } from './aws_catalog_integration_header';
import { AwsCatalogNestedFlow } from './aws_catalog_nested_flow';
import { AWS_CATALOG_ENTRY_TILE } from './aws_catalog_entry_tile';

export interface AwsCatalogOnboardingWizardProps {
  readonly onBackToCatalogue: () => void;
}

/** Full-page AWS onboarding wizard (same layout as the catalog modal aws-setup view). */
export const AwsCatalogOnboardingWizard: React.FC<AwsCatalogOnboardingWizardProps> = ({
  onBackToCatalogue,
}) => {
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
      `}
      data-test-subj="streamsAwsCatalogOnboardingWizard"
    >
      <AwsCatalogIntegrationHeader
        logoSrc={AWS_CATALOG_ENTRY_TILE.logoUrl}
        logoAlt={AWS_CATALOG_ENTRY_TILE.name}
        title={AWS_CATALOG_ENTRY_TILE.name}
      />
      <AwsCatalogNestedFlow onBackToCatalogue={onBackToCatalogue} />
    </div>
  );
};
