/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React from 'react';

import { NoIndices } from '../../../components/empty_states/no_indices';
import { WithKibanaChrome } from '../../../containers/with_kibana_chrome';
import {
  ViewSourceConfigurationButton,
  ViewSourceConfigurationButtonHrefBase,
} from '../../../components/source_configuration';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';

export const LogsPageNoIndicesContent = () => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  return (
    <WithKibanaChrome>
      {({ basePath }) => (
        <NoIndices
          data-test-subj="noLogsIndicesPrompt"
          title={i18n.translate('xpack.infra.logsPage.noLoggingIndicesTitle', {
            defaultMessage: "Looks like you don't have any logging indices.",
          })}
          message={i18n.translate('xpack.infra.logsPage.noLoggingIndicesDescription', {
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
                  {i18n.translate('xpack.infra.logsPage.noLoggingIndicesInstructionsActionLabel', {
                    defaultMessage: 'View setup instructions',
                  })}
                </EuiButton>
              </EuiFlexItem>
              {uiCapabilities?.logs?.configureSource ? (
                <EuiFlexItem>
                  <ViewSourceConfigurationButton
                    data-test-subj="configureSourceButton"
                    hrefBase={ViewSourceConfigurationButtonHrefBase.logs}
                  >
                    {i18n.translate('xpack.infra.configureSourceActionLabel', {
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
};
