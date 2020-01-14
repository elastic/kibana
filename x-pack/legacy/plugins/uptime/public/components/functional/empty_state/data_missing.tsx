/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useContext } from 'react';
import { UptimeSettingsContext } from '../../../contexts';

interface DataMissingProps {
  headingMessage: string;
}

export const DataMissing = ({ headingMessage }: DataMissingProps) => {
  const { basePath } = useContext(UptimeSettingsContext);
  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <EuiPanel>
          <EuiEmptyPrompt
            iconType="uptimeApp"
            title={
              <EuiTitle size="l">
                <h3>{headingMessage}</h3>
              </EuiTitle>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.uptime.dataMissing.configureHeartbeatToGetStartedMessage"
                  defaultMessage="{configureHeartbeatLink} to start logging uptime data."
                  values={{
                    configureHeartbeatLink: (
                      <EuiLink
                        target="_blank"
                        href={`${basePath}/app/kibana#/home/tutorial/uptimeMonitors`}
                      >
                        <FormattedMessage
                          id="xpack.uptime.emptyState.configureHeartbeatLinkText"
                          defaultMessage="Configure Heartbeat"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            }
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
