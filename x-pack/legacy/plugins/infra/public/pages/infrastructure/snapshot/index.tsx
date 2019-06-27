/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n, InjectedIntl } from '@kbn/i18n/react';
import React, { useContext } from 'react';
import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import { SnapshotPageContent } from './page_content';
import { SnapshotToolbar } from './toolbar';

import { DocumentTitle } from '../../../components/document_title';
import { NoIndices } from '../../../components/empty_states/no_indices';
import { Header } from '../../../components/header';
import { ColumnarPage } from '../../../components/page';

import { SourceConfigurationFlyout } from '../../../components/source_configuration';
import { SourceConfigurationFlyoutState } from '../../../components/source_configuration';
import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { Source } from '../../../containers/source';
import { WithWaffleFilterUrlState } from '../../../containers/waffle/with_waffle_filters';
import { WithWaffleOptionsUrlState } from '../../../containers/waffle/with_waffle_options';
import { WithWaffleTimeUrlState } from '../../../containers/waffle/with_waffle_time';
import { WithKibanaChrome } from '../../../containers/with_kibana_chrome';

interface SnapshotPageProps {
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
}

export const SnapshotPage = injectUICapabilities(
  injectI18n((props: SnapshotPageProps) => {
    const { intl, uiCapabilities } = props;
    const { showIndicesConfiguration } = useContext(SourceConfigurationFlyoutState.Context);
    const {
      derivedIndexPattern,
      hasFailedLoadingSource,
      isLoading,
      loadSourceFailureMessage,
      loadSource,
      metricIndicesExist,
    } = useContext(Source.Context);

    return (
      <ColumnarPage>
        <DocumentTitle
          title={(previousTitle: string) =>
            intl.formatMessage(
              {
                id: 'xpack.infra.infrastructureSnapshotPage.documentTitle',
                defaultMessage: '{previousTitle} | Inventory',
              },
              {
                previousTitle,
              }
            )
          }
        />
        <Header
          breadcrumbs={[
            {
              href: '#/',
              text: intl.formatMessage({
                id: 'xpack.infra.header.infrastructureTitle',
                defaultMessage: 'Infrastructure',
              }),
            },
          ]}
          readOnlyBadge={!uiCapabilities.infrastructure.save}
        />
        <SourceConfigurationFlyout
          shouldAllowEdit={uiCapabilities.infrastructure.configureSource as boolean}
        />
        {isLoading ? (
          <SourceLoadingPage />
        ) : metricIndicesExist ? (
          <>
            <WithWaffleTimeUrlState />
            <WithWaffleFilterUrlState indexPattern={derivedIndexPattern} />
            <WithWaffleOptionsUrlState />
            <SnapshotToolbar />
            <SnapshotPageContent />
          </>
        ) : hasFailedLoadingSource ? (
          <SourceErrorPage errorMessage={loadSourceFailureMessage || ''} retry={loadSource} />
        ) : (
          <WithKibanaChrome>
            {({ basePath }) => (
              <NoIndices
                title={intl.formatMessage({
                  id: 'xpack.infra.homePage.noMetricsIndicesTitle',
                  defaultMessage: "Looks like you don't have any metrics indices.",
                })}
                message={intl.formatMessage({
                  id: 'xpack.infra.homePage.noMetricsIndicesDescription',
                  defaultMessage: "Let's add some!",
                })}
                actions={
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiButton
                        href={`${basePath}/app/kibana#/home/tutorial_directory/metrics`}
                        color="primary"
                        fill
                        data-test-subj="infrastructureViewSetupInstructionsButton"
                      >
                        {intl.formatMessage({
                          id: 'xpack.infra.homePage.noMetricsIndicesInstructionsActionLabel',
                          defaultMessage: 'View setup instructions',
                        })}
                      </EuiButton>
                    </EuiFlexItem>
                    {uiCapabilities.infrastructure.configureSource ? (
                      <EuiFlexItem>
                        <EuiButton
                          data-test-subj="configureSourceButton"
                          color="primary"
                          onClick={showIndicesConfiguration}
                        >
                          {intl.formatMessage({
                            id: 'xpack.infra.configureSourceActionLabel',
                            defaultMessage: 'Change source configuration',
                          })}
                        </EuiButton>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                }
                data-test-subj="noMetricsIndicesPrompt"
              />
            )}
          </WithKibanaChrome>
        )}
      </ColumnarPage>
    );
  })
);
