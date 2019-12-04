/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import { WithKibanaChrome } from '../../../containers/with_kibana_chrome';
import {
  ViewSourceConfigurationButton,
  ViewSourceConfigurationButtonHrefBase,
} from '../../../components/source_configuration';

interface InvalidNodeErrorProps {
  nodeName: string;
}

export const InvalidNodeError: React.FunctionComponent<InvalidNodeErrorProps> = ({ nodeName }) => {
  return (
    <WithKibanaChrome>
      {({ basePath }) => (
        <CenteredEmptyPrompt
          title={
            <h2>
              <FormattedMessage
                id="xpack.infra.metrics.invalidNodeErrorTitle"
                defaultMessage="Looks like {nodeName} isn't collecting any metrics data"
                values={{
                  nodeName,
                }}
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.infra.metrics.invalidNodeErrorDescription"
                defaultMessage="Double check your configuration"
              />
            </p>
          }
          actions={
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiButton
                  href={`${basePath}/app/kibana#/home/tutorial_directory/metrics`}
                  color="primary"
                  fill
                >
                  <FormattedMessage
                    id="xpack.infra.homePage.noMetricsIndicesInstructionsActionLabel"
                    defaultMessage="View setup instructions"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <ViewSourceConfigurationButton
                  data-test-subj="configureSourceButton"
                  hrefBase={ViewSourceConfigurationButtonHrefBase.infrastructure}
                >
                  <FormattedMessage
                    id="xpack.infra.configureSourceActionLabel"
                    defaultMessage="Change source configuration"
                  />
                </ViewSourceConfigurationButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      )}
    </WithKibanaChrome>
  );
};

const CenteredEmptyPrompt = euiStyled(EuiEmptyPrompt)`
  align-self: center;
`;
