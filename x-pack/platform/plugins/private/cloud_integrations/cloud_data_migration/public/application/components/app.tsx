/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { CoreStart } from '@kbn/core/public';

import { getAppStyles } from '../../app.styles';
import { BreadcrumbService } from '../services/breadcrumbs';

interface CloudDataMigrationAppDeps {
  http: CoreStart['http'];
  breadcrumbService: BreadcrumbService;
}

export const CloudDataMigrationApp = ({ http, breadcrumbService }: CloudDataMigrationAppDeps) => {
  const basePath = http.basePath.get() ?? '';
  const { euiTheme } = useEuiTheme();
  const listItemProps = {
    iconType: 'checkInCircleFilled',
    iconProps: { color: 'success' },
    wrapText: true,
  };
  const styles = getAppStyles(euiTheme);

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('home');
  }, [breadcrumbService]);

  return (
    <EuiPanel css={styles.panelCss} color="subdued">
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        gutterSize="xl"
        justifyContent="spaceBetween"
        css={styles.layoutCss}
      >
        <EuiFlexItem>
          <EuiImage
            alt={i18n.translate('xpack.cloudDataMigration.illustration.alt.text', {
              defaultMessage: 'Illustration for cloud data migration',
            })}
            css={styles.illustrationCss}
            src={`${basePath}/plugins/kibanaReact/assets/` + 'illustration_cloud_migration.png'}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h1>
              <FormattedMessage
                id="xpack.cloudDataMigration.migrateToCloudTitle"
                defaultMessage="Be faster and more efficient with Elastic Cloud"
              />
            </h1>
          </EuiTitle>

          <EuiSpacer size="xl" />

          <EuiListGroup maxWidth={700}>
            <EuiListGroupItem
              {...listItemProps}
              label={
                <EuiText css={styles.listItemCss} size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.cloudDataMigration.deployInSeconds.text"
                    defaultMessage="Deploy and scale a secure Elastic Stack in minutes"
                  />
                </EuiText>
              }
            />

            <EuiListGroupItem
              {...listItemProps}
              label={
                <EuiText css={styles.listItemCss} size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.cloudDataMigration.monitorDeployments.text"
                    defaultMessage="Monitor and manage multiple deployments from a single place"
                  />
                </EuiText>
              }
            />

            <EuiListGroupItem
              {...listItemProps}
              label={
                <EuiText css={styles.listItemCss} size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.cloudDataMigration.upgrade.text"
                    defaultMessage="Upgrade to newer versions much more easily"
                  />
                </EuiText>
              }
            />

            <EuiListGroupItem
              {...listItemProps}
              label={
                <EuiText css={styles.listItemCss} size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.cloudDataMigration.slaBackedSupport.text"
                    defaultMessage="Get all of your questions answered with SLA-backed support"
                  />
                </EuiText>
              }
            />
          </EuiListGroup>

          <EuiSpacer size="l" />

          <div>
            <EuiButton
              fill={true}
              target="_blank"
              href="https://ela.st/cloud-migration"
              // data-test-subj used for Telemetry
              data-test-subj="migrate_data_to_cloud__stack_management_link"
            >
              <FormattedMessage
                id="xpack.cloudDataMigration.readInstructionsButtonLabel"
                defaultMessage="Move to Elastic Cloud"
              />
            </EuiButton>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
