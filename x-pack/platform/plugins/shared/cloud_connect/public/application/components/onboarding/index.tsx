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
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useCloudConnectedAppContext } from '../../app_context';
import { ConnectionWizard } from './connection_wizard';
import { ServiceCards } from './service_cards';
import { COLUMN_SIZE } from './constants';

interface OnboardingPageProps {
  onConnect: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onConnect }) => {
  const { http, docLinks, hasConfigurePermission, telemetryService } =
    useCloudConnectedAppContext();

  return (
    <EuiPageSection restrictWidth={1200}>
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
          <EuiText size="m">
            <p>
              <FormattedMessage
                id="xpack.cloudConnect.onboarding.pageDescription"
                defaultMessage="With Cloud Connect, you can use Elastic Cloud services in your self-managed cluster without having to install and maintain their infrastructure yourself. Get faster access to new features with none of the operational overhead. {learnMoreLink}"
                values={{
                  learnMoreLink: (
                    <EuiLink
                      href={docLinks.links.cloud.cloudConnect}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        // Track telemetry for onboarding learn more link
                        telemetryService.trackLinkClicked({
                          destination_type: 'onboarding_docs',
                        });
                      }}
                    >
                      {i18n.translate(
                        'xpack.cloudConnect.onboarding.pageDescription.learnMoreLinkText',
                        {
                          defaultMessage: 'Learn more',
                        }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
          {!hasConfigurePermission && (
            <>
              <EuiSpacer size="m" />
              <EuiText
                color="subdued"
                size="s"
                style={{ fontStyle: 'italic' }}
                data-test-subj="onboardingPermissionWarning"
              >
                <p>
                  <FormattedMessage
                    id="xpack.cloudConnect.onboarding.noPermissionsDescription"
                    defaultMessage="You must have All privileges granted to connect a cluster to Elastic Cloud. Contact your admin to get started."
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

      <EuiFlexGroup justifyContent="spaceBetween">
        {hasConfigurePermission && (
          <EuiFlexItem grow={true}>
            <div style={{ maxWidth: '650px' }}>
              <ConnectionWizard onConnect={onConnect} />
            </div>
          </EuiFlexItem>
        )}

        <ServiceCards hasPermissions={hasConfigurePermission} />
      </EuiFlexGroup>
    </EuiPageSection>
  );
};
