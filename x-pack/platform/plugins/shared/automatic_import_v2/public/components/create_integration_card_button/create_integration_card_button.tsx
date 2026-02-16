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
  EuiHorizontalRule,
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

export interface CreateIntegrationCardButtonProps {
  compressed?: boolean;
}

export const CreateIntegrationCardButton = React.memo<CreateIntegrationCardButtonProps>(
  ({ compressed = false }) => {
    const { getUrlForApp, navigateToUrl } = useKibana().services.application;
    const { euiTheme } = useEuiTheme();

    const createHref = useMemo(
      () => getUrlForApp('integrations', { path: '/create' }),
      [getUrlForApp]
    );

    const uploadHref = useMemo(
      () => getUrlForApp('integrations', { path: '/create/upload' }),
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
        hasBorder={false}
        paddingSize="m"
        data-test-subj="createIntegrationCardButton"
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePrimary};
          border-radius: ${euiTheme.border.radius.medium};
        `}
      >
        <EuiTitle size="xxs">
          <h3>
            <FormattedMessage
              id="xpack.automaticImportV2.createIntegrationTitle"
              defaultMessage="Can't find an integration?"
            />
          </h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="flexStart">
          <EuiFlexItem grow={false}>
            <EuiIcon type="monitoringApp" size="xxl" color={euiTheme.colors.primary} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs">
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

        <EuiHorizontalRule margin="s" />

        {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
        <EuiLink
          color="primary"
          href={createHref}
          onClick={navigateToCreate}
          data-test-subj="createNewIntegrationLink"
          css={css`
            display: block;
            text-decoration: none;
          `}
        >
          <EuiPanel
            hasShadow={false}
            hasBorder={false}
            paddingSize="s"
            css={css`
              border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.primary};
              border-radius: ${euiTheme.border.radius.medium};
              background-color: transparent;
            `}
          >
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              justifyContent="center"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type="plusInCircle" size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
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
CreateIntegrationCardButton.displayName = 'CreateIntegrationCardButton';
