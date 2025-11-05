/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiImage,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConnectionWizard } from './connection_wizard';
import { ServiceCards } from './service_cards';
import { PAGE_TITLE, PAGE_DESCRIPTION } from './translations';

interface OnboardingPageProps {
  onConnect: (apiKey: string) => void;
  addBasePath: (path: string) => string;
  docLinksSecureSavedObject: string;
}

const COLUMN_SIZE = 340;

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  onConnect,
  addBasePath,
  docLinksSecureSavedObject,
}) => {
  return (
    <EuiPageSection>
      {/* Header Section with Title and Image */}
      <EuiFlexGroup alignItems="center" gutterSize="xl">
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>{PAGE_TITLE}</h1>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiText>
            <p>{PAGE_DESCRIPTION}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem style={{ width: 90 }} grow={false} />
        <EuiFlexItem grow={false}>
          <EuiImage
            alt={i18n.translate('xpack.cloudConnected.onboarding.illustration.alt', {
              defaultMessage: 'Illustration for cloud data migration',
            })}
            src={addBasePath('/plugins/kibanaReact/assets/') + 'illustration_cloud_migration.png'}
            size="fullWidth"
            style={{ maxWidth: `${COLUMN_SIZE}px` }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xxl" />

      {/* Main Content Section */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={true}>
          <div style={{ maxWidth: '650px' }}>
            <ConnectionWizard
              onConnect={onConnect}
              docLinksSecureSavedObject={docLinksSecureSavedObject}
            />
          </div>
        </EuiFlexItem>

        <EuiFlexItem grow={false} style={{ width: `${COLUMN_SIZE}px` }}>
          <ServiceCards />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageSection>
  );
};
