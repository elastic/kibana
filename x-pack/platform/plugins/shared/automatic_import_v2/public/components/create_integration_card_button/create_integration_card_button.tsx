/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButton, EuiLink, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useKibana } from '../../common/hooks/use_kibana';
import autoImportIntegrationsImage from '../../common/images/auto_import_integrations.svg';

const useStyles = (borderRadius: string, euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => ({
  panel: css`
    background: linear-gradient(
      112.41deg,
      ${euiTheme.colors.backgroundBasePrimary} 3.58%,
      ${euiTheme.colors.backgroundBaseSuccess} 98.48%
    );
    width: min(100%, 285px);
    height: 179px;
    border-radius: 6px;
    padding: 16px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  title: css`
    margin: 0;
    width: 253px;
    max-width: 100%;
    min-height: 24px;
    font-size: ${euiTheme.font.scale.m};
    line-height: 24px;
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.title};
  `,
  contentRow: css`
    width: 253px;
    max-width: 100%;
    height: 55px;
    gap: 16px;
    display: flex;
    align-items: flex-start;
    margin: 0 0 12px 0;
  `,
  image: css`
    width: 55px;
    height: 55px;
    min-width: 55px;
    display: block;
    object-fit: contain;
  `,
  descriptionContainer: css`
    flex: 1;
    min-width: 0;
    max-width: 175px;
  `,
  descriptionText: css`
    font-size: ${euiTheme.font.scale.s};
    line-height: 18px;
    color: ${euiTheme.colors.text};
    p {
      margin: 0;
    }
    a {
      white-space: normal;
      word-break: normal;
    }
  `,
  ctaButton: css`
    width: 253px;
    max-width: 100%;
    min-width: 96px;
    height: 32px;
    padding-left: ${euiTheme.size.s};
    padding-right: ${euiTheme.size.s};
    border-radius: ${borderRadius};
    background: ${euiTheme.colors.backgroundLightPrimary};
    margin-top: auto;
    .euiButton__content {
      gap: 4px;
    }
  `,
});

export const CreateIntegrationSideCardButton = React.memo(() => {
  const { getUrlForApp, navigateToUrl } = useKibana().services.application;
  const { euiTheme } = useEuiTheme();
  const styles = useStyles(String(euiTheme.border.radius.medium ?? '4px'), euiTheme);

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
      hasBorder
      paddingSize="none"
      data-test-subj="createIntegrationCardButton"
      css={styles.panel}
    >
      <h4 css={styles.title}>
        <FormattedMessage
          id="xpack.automaticImportV2.createIntegrationTitle"
          defaultMessage="Can't find an integration?"
        />
      </h4>

      <div css={styles.contentRow}>
        <img alt="" src={autoImportIntegrationsImage} css={styles.image} />
        <div css={styles.descriptionContainer}>
          <EuiText size="xs" css={styles.descriptionText}>
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
        </div>
      </div>
      {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
      <EuiButton
        color="primary"
        size="s"
        iconType="plusCircle"
        iconSide="left"
        href={createHref}
        onClick={navigateToCreate}
        data-test-subj="createNewIntegrationLink"
        css={styles.ctaButton}
      >
        <FormattedMessage
          id="xpack.automaticImportV2.createIntegrationButton"
          defaultMessage="Create new integration"
        />
      </EuiButton>
    </EuiPanel>
  );
});
CreateIntegrationSideCardButton.displayName = 'CreateIntegrationCardButton';
