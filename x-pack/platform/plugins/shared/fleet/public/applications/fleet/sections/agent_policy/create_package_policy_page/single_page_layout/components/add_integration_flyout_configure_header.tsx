/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { PackageIcon } from '../../../../../components';

interface Props {
  pkgName: string;
  pkgVersion?: string;
  integration?: string;
  pkgLabel?: string;
}

export const AddIntegrationFlyoutConfigureHeader: React.FC<Props> = ({
  pkgName,
  pkgVersion,
  pkgLabel,
  integration,
}) => {
  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="m" color="subdued">
            <FormattedMessage
              id="xpack.fleet.addIntegrationFlyout.configureIntegrationDesc"
              defaultMessage="Edit the necessary fields to configure your selected integration:"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow fullWidth>
            <EuiFlexGroup direction="row" gutterSize="s">
              <EuiFlexItem grow={false}>
                <PackageIcon
                  packageName={pkgName}
                  version={pkgVersion || ''}
                  integrationName={integration}
                  size="l"
                  tryApi={true}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="m">{pkgLabel}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="m" color="subdued">
                  <FormattedMessage
                    id="xpack.fleet.addIntegrationFlyout.needMoreInfoText"
                    defaultMessage=" - Need more info? {readMoreLink}"
                    values={{
                      readMoreLink: (
                        <EuiLink
                          href={`https://www.elastic.co/docs/reference/integrations/${pkgName}${
                            integration ? '/' + integration : ''
                          }`}
                          external
                          target="_blank"
                        >
                          <FormattedMessage
                            id="xpack.fleet.addIntegrationFlyout.integrationInfoLink"
                            defaultMessage="Read more about {pkgLabel}"
                            values={{ pkgLabel }}
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </>
  );
};
