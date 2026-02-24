/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useKibana } from '../../common/hooks/use_kibana';
import autoImportIntegrationsImage from '../../common/images/auto_import_integrations.svg';

export interface CreateIntegrationSideCardButtonProps {
  compressed?: boolean;
}

const useStyles = (compressed: boolean, borderRadius: string) => ({
  panel: css`
    background-color: #d7e3e6;
    border-color: #b9c8d0;
    border-radius: ${borderRadius};
  `,
  image: css`
    width: ${compressed ? '84px' : '108px'};
    min-width: ${compressed ? '84px' : '108px'};
    display: block;
  `,
  buttonLink: css`
    display: block;
    text-decoration: none;
  `,
  buttonPanel: css`
    width: 100%;
    border: none;
    border-radius: ${borderRadius};
    background-color: #bccbe4;
  `,
});

export const CreateIntegrationSideCardButton = React.memo<CreateIntegrationSideCardButtonProps>(
  ({ compressed = false }) => {
    const { getUrlForApp, navigateToUrl } = useKibana().services.application;
    const { euiTheme } = useEuiTheme();
    const styles = useStyles(compressed, String(euiTheme.border.radius.medium ?? '4px'));

    const createHref = useMemo(
      () => getUrlForApp('integrations', { path: '/create' }),
      [getUrlForApp]
    );

    const uploadHref = useMemo(
      () => getUrlForApp('integrations', { path: '/upload' }),
      [getUrlForApp]
    );

    const navigateToCreate = useCallback(
      (ev: React.MouseEvent<HTMLAnchorElement>) => {
        ev.preventDefault();
        navigateToUrl(createHref);
      },
      [createHref, navigateToUrl]
    );

    const navigateToUpload = useCallback(
      (ev: React.MouseEvent<HTMLAnchorElement>) => {
        ev.preventDefault();
        navigateToUrl(uploadHref);
      },
      [uploadHref, navigateToUrl]
    );

    return (
      <EuiPanel
        hasShadow={false}
        hasBorder={true}
        paddingSize={compressed ? 's' : 'm'}
        data-test-subj="createIntegrationCardButton"
        css={styles.panel}
      >
        <EuiTitle size="xxs">
          <h3>
            <FormattedMessage
              id="xpack.automaticImportV2.createIntegrationTitle"
              defaultMessage="Can't find an integration?"
            />
          </h3>
        </EuiTitle>

        <EuiSpacer size={compressed ? 's' : 'm'} />

        <EuiFlexGroup gutterSize={compressed ? 's' : 'm'} responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiImage alt="" src={autoImportIntegrationsImage} css={styles.image} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size={compressed ? 'xs' : 's'}>
              <FormattedMessage
                id="xpack.automaticImportV2.createIntegrationDescription"
                defaultMessage="Use AI to create a new one or {uploadLink}"
                values={{
                  uploadLink: (
                    // eslint-disable-next-line @elastic/eui/href-or-on-click
                    <EuiLink
                      href={uploadHref}
                      onClick={navigateToUpload}
                      data-test-subj="uploadIntegrationPackageLink"
                    >
                      <FormattedMessage
                        id="xpack.automaticImportV2.createIntegrationUploadLink"
                        defaultMessage="upload an integration package"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size={compressed ? 's' : 'm'} />

        {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
        <EuiLink
          color="primary"
          href={createHref}
          onClick={navigateToCreate}
          data-test-subj="createNewIntegrationLink"
          css={styles.buttonLink}
        >
          <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s" css={styles.buttonPanel}>
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              justifyContent="center"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type="plusInCircle" size="m" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size={compressed ? 'xs' : 'm'}>
                  <strong>
                    <FormattedMessage
                      id="xpack.automaticImportV2.createIntegrationButton"
                      defaultMessage="Create new integration"
                    />
                  </strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiLink>
      </EuiPanel>
    );
  }
);
CreateIntegrationSideCardButton.displayName = 'CreateIntegrationCardButton';
