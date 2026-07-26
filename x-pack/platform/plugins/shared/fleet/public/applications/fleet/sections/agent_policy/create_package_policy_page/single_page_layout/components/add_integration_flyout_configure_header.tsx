/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiLink, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
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
  const theme = useEuiTheme();
  return (
    <>
      <EuiText size="m" color="subdued">
        <FormattedMessage
          id="xpack.fleet.addIntegrationFlyout.configureIntegrationDesc"
          defaultMessage="Edit the necessary fields to configure your selected integration:"
        />
      </EuiText>
      <EuiSpacer size="s" />
      <PackageIcon
        packageName={pkgName}
        version={pkgVersion || ''}
        integrationName={integration}
        size="l"
        tryApi={true}
        css={css`
          margin-right: ${theme.euiTheme.size.s};
        `}
      />
      <EuiText size="m" component="span">
        {pkgLabel}
      </EuiText>
      <EuiText size="m" component="span" color="subdued">
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
      <EuiSpacer size="l" />
    </>
  );
};
