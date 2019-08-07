/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n, InjectedIntl } from '@kbn/i18n/react';
import React from 'react';

import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import { NoIndices } from '../../../components/empty_states/no_indices';
import { WithKibanaChrome } from '../../../containers/with_kibana_chrome';
import {
  ViewSourceConfigurationButton,
  ViewSourceConfigurationButtonHrefBase,
} from '../../../components/source_configuration';

interface LogsPageNoIndicesContentProps {
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
}

export const LogsPageNoIndicesContent = injectUICapabilities(
  injectI18n((props: LogsPageNoIndicesContentProps) => {
    const { intl, uiCapabilities } = props;

    return (
      <WithKibanaChrome>
        {({ basePath }) => (
          <NoIndices
            data-test-subj="noLogsIndicesPrompt"
            title={intl.formatMessage({
              id: 'xpack.infra.logsPage.noLoggingIndicesTitle',
              defaultMessage: "Looks like you don't have any logging indices.",
            })}
            message={intl.formatMessage({
              id: 'xpack.infra.logsPage.noLoggingIndicesDescription',
              defaultMessage: "Let's add some!",
            })}
            actions={
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiButton
                    href={`${basePath}/app/kibana#/home/tutorial_directory/logging`}
                    color="primary"
                    fill
                    data-test-subj="logsViewSetupInstructionsButton"
                  >
                    {intl.formatMessage({
                      id: 'xpack.infra.logsPage.noLoggingIndicesInstructionsActionLabel',
                      defaultMessage: 'View setup instructions',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                {uiCapabilities.logs.configureSource ? (
                  <EuiFlexItem>
                    <ViewSourceConfigurationButton
                      data-test-subj="configureSourceButton"
                      hrefBase={ViewSourceConfigurationButtonHrefBase.logs}
                    >
                      {intl.formatMessage({
                        id: 'xpack.infra.configureSourceActionLabel',
                        defaultMessage: 'Change source configuration',
                      })}
                    </ViewSourceConfigurationButton>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            }
          />
        )}
      </WithKibanaChrome>
    );
  })
);
