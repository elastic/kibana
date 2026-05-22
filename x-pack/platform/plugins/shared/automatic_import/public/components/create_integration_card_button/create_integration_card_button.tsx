/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { AutomaticImportTelemetryEventType } from '../../../common/telemetry/types';
import { useKibana } from '../../common/hooks/use_kibana';
import type { Services } from '../../services/types';
import type { AutomaticImportPluginStart } from '../../types';
import autoImportIntegrationsImage from '../../common/images/auto_import_integrations.svg';

interface ServicesWithOptionalAutomaticImportTelemetry extends Services {
  automaticImport?: AutomaticImportPluginStart;
}

const useStyles = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => ({
  panel: css`
    background: linear-gradient(
      112.41deg,
      ${euiTheme.colors.backgroundBasePrimary} 3.58%,
      ${euiTheme.colors.backgroundBaseSuccess} 98.48%
    );
    container-type: inline-size;
    max-width: 240px;
  `,
  panelContent: css`
    gap: 12px;
  `,
  title: css`
    margin: none;
    max-width: 100%;
    word-wrap: break-word;
    font-size: ${euiTheme.font.scale.m};
    line-height: 16px;
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.title};
  `,
  contentRow: css`
    display: flex;
    flex-wrap: nowrap;
    @container (max-width: 150px) {
      flex-wrap: wrap;
      justify-content: center;
    }
  `,
  imageContainer: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  image: css`
    width: 55px;
    height: 55px;
    object-fit: contain;
  `,
  descriptionContainer: css`
    flex: 1 1 auto;
    min-width: 0;
    @container (max-width: 200px) {
      flex-basis: 100%;
    }
  `,
  descriptionText: css`
    color: ${euiTheme.colors.text};
  `,
  ctaButton: css`
    background: ${euiTheme.colors.backgroundLightPrimary};
    @container (max-width: 150px) {
      min-width: 32px;
      padding-inline: ${euiTheme.size.s};
    }
    @container (max-width: 160px) {
      .euiIcon {
        display: none;
      }
    }
  `,
  ctaButtonText: css`
    @container (max-width: 160px) {
      display: none;
    }
  `,
  ctaButtonTextShort: css`
    display: none;
    @container (max-width: 160px) {
      display: inline;
    }
  `,
});

export const CreateIntegrationSideCardButton = React.memo(() => {
  const services = useKibana().services as ServicesWithOptionalAutomaticImportTelemetry;
  const { getUrlForApp, navigateToUrl } = services.application;
  const telemetry = services.automaticImport?.telemetry ?? services.telemetry;
  const { euiTheme } = useEuiTheme();
  const styles = useStyles(euiTheme);

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
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.UploadIntegrationClicked, {});
      navigateToUrl(uploadHref);
    },
    [uploadHref, navigateToUrl, telemetry]
  );

  return (
    <EuiFlexGroup justifyContent="center">
      <EuiPanel
        hasShadow={false}
        hasBorder
        data-test-subj="createIntegrationCardButton"
        css={styles.panel}
      >
        <EuiFlexGroup direction="column" css={styles.panelContent}>
          <EuiFlexItem css={styles.title}>
            <FormattedMessage
              id="xpack.automaticImport.createIntegrationTitle"
              defaultMessage="Can't find an integration?"
            />
          </EuiFlexItem>

          <EuiFlexGroup direction="row" wrap={false} css={styles.contentRow}>
            <EuiFlexItem grow={false} css={styles.imageContainer}>
              <img alt="" src={autoImportIntegrationsImage} css={styles.image} />
            </EuiFlexItem>
            <EuiFlexItem css={styles.descriptionContainer}>
              <EuiText size="xs" css={styles.descriptionText}>
                <FormattedMessage
                  id="xpack.automaticImport.createIntegrationDescription"
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
                          id="xpack.automaticImport.createIntegrationUploadLink"
                          defaultMessage="upload an integration package"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
          <EuiButton
            color="primary"
            size="s"
            iconType="plusCircle"
            iconSide="left"
            fullWidth
            href={createHref}
            onClick={navigateToCreate}
            data-test-subj="createNewIntegrationLink"
            css={styles.ctaButton}
          >
            <span css={styles.ctaButtonText}>
              <FormattedMessage
                id="xpack.automaticImport.createIntegrationButton"
                defaultMessage="Create integration"
              />
            </span>
            <span css={styles.ctaButtonTextShort}>
              <FormattedMessage
                id="xpack.automaticImport.createIntegrationButtonShort"
                defaultMessage="Create"
              />
            </span>
          </EuiButton>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexGroup>
  );
});
CreateIntegrationSideCardButton.displayName = 'CreateIntegrationCardButton';
