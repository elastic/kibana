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
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { UptimeSettingsContext } from '../../../contexts';
import { DynamicSettings } from '../../../../common/runtime_types';
import { SETTINGS_ROUTE } from '../../../../common/constants';
import { SETTINGS_LINK_TEXT } from '../../../pages/page_header';

interface DataMissingProps {
  headingMessage: JSX.Element;
  settings?: DynamicSettings;
}

export const DataOrIndexMissing = ({ headingMessage, settings }: DataMissingProps) => {
  const { basePath } = useContext(UptimeSettingsContext);
  return (
    <EuiFlexGroup justifyContent="center" data-test-subj="data-missing">
      <EuiFlexItem grow={false} style={{ flexBasis: 700 }}>
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
              <>
                <p>
                  <FormattedMessage
                    id="xpack.uptime.emptyState.configureHeartbeatToGetStartedMessage"
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
                <p>
                  <FormattedMessage
                    id="xpack.uptime.emptyState.configureHeartbeatToGetStartedMessage"
                    defaultMessage={`Use {settingsLink} to update Index pattern for matching
                    indices that contain Heartbeat data.`}
                    values={{
                      settingsLink: <Link to={SETTINGS_ROUTE}>{SETTINGS_LINK_TEXT}</Link>,
                    }}
                  />
                </p>
              </>
            }
            actions={
              <EuiButton
                color="primary"
                fill
                iconType="gear"
                href={`${basePath}/app/kibana#/home/tutorial/uptimeMonitors`}
              >
                <FormattedMessage
                  id="xpack.uptime.emptyState.addDataWithHeartbeat"
                  defaultMessage={`Add data with Heartbeat`}
                />
              </EuiButton>
            }
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
