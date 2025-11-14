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
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useCloudConnectedAppContext } from '../../application/app_context';
import { ConnectionWizard } from './connection_wizard';
import { ServiceCards } from './service_cards';
import { COLUMN_SIZE } from './constants';

interface OnboardingPageProps {
  onConnect: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onConnect }) => {
  const { http, application } = useCloudConnectedAppContext();
  const hasPermissions =
    application.capabilities.cloudConnect?.configure === true &&
    application.capabilities.cloudConnect?.connect === true;

  return (
    <EuiPageSection restrictWidth={1200}>
      {/* Header Section with Title and Image */}
      <EuiFlexGroup alignItems="center" gutterSize="xl">
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="xpack.cloudConnect.onboarding.pageTitle"
                defaultMessage="Get started with Cloud Connect"
              />
            </h1>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.cloudConnect.onboarding.pageDescription"
                defaultMessage="Cloud Connect allows customers running self-managed Elastic Software to access Elastic capabilities as a Cloud service without the operational overhead of managing the infrastructure required to run."
              />
            </p>
          </EuiText>
          {!hasPermissions && (
            <>
              <EuiSpacer size="m" />
              <EuiText color="subdued" size="s" style={{ fontStyle: 'italic' }}>
                <p>
                  <FormattedMessage
                    id="xpack.cloudConnect.onboarding.noPermissionsDescription"
                    defaultMessage="Only Admins can establish connection. Reach out to your Admin to get started."
                  />
                </p>
              </EuiText>
            </>
          )}
        </EuiFlexItem>
        <EuiFlexItem style={{ width: 90 }} grow={false} />
        <EuiFlexItem grow={false}>
          <EuiImage
            alt={i18n.translate('xpack.cloudConnect.onboarding.illustration.alt', {
              defaultMessage: 'Illustration for cloud data migration',
            })}
            src={
              http.basePath.prepend('/plugins/kibanaReact/assets/') +
              'illustration_cloud_migration.png'
            }
            size="fullWidth"
            style={{ maxWidth: `${COLUMN_SIZE}px` }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xxl" />

      {/* Main Content Section */}
      <EuiFlexGroup justifyContent="spaceBetween">
        {hasPermissions && (
          <EuiFlexItem grow={true}>
            <div style={{ maxWidth: '650px' }}>
              <ConnectionWizard onConnect={onConnect} />
            </div>
          </EuiFlexItem>
        )}

        <ServiceCards hasPermissions={hasPermissions} />
      </EuiFlexGroup>
    </EuiPageSection>
  );
};
