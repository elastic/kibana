/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSelect,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiText,
  EuiCode,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';

import type { Agent } from '../../../../../types';
import { sendPostAgentAction, useAuthz, useStartServices } from '../../../../../hooks';

import { AGENT_LOG_LEVELS, DEFAULT_LOG_LEVEL } from '../../../../../../../../common/constants';

export const SelectLogLevel: React.FC<{ agent: Agent; agentPolicyLogLevel?: string }> = memo(
  ({ agent, agentPolicyLogLevel = DEFAULT_LOG_LEVEL }) => {
    const authz = useAuthz();
    const { notifications, docLinks } = useStartServices();
    const [isSetLevelLoading, setIsSetLevelLoading] = useState(false);
    const [agentLogLevel, setAgentLogLevel] = useState(
      agent.local_metadata?.elastic?.agent?.log_level ?? DEFAULT_LOG_LEVEL
    );
    const [selectedLogLevel, setSelectedLogLevel] = useState(agentLogLevel);

    const onClickApply = useCallback(() => {
      setIsSetLevelLoading(true);
      async function send() {
        try {
          const res = await sendPostAgentAction(agent.id, {
            action: {
              type: 'SETTINGS',
              data: {
                log_level: selectedLogLevel,
              },
            },
          });
          if (res.error) {
            throw res.error;
          }
          setAgentLogLevel(selectedLogLevel);
          notifications.toasts.addSuccess(
            i18n.translate('xpack.fleet.agentLogs.selectLogLevel.successText', {
              defaultMessage: `Changed agent logging level to ''{logLevel}''`,
              values: {
                logLevel: selectedLogLevel,
              },
            })
          );
        } catch (error) {
          notifications.toasts.addError(error, {
            title: i18n.translate('xpack.fleet.agentLogs.selectLogLevel.errorTitleText', {
              defaultMessage: 'Error updating agent logging level',
            }),
          });
        }
        setIsSetLevelLoading(false);
      }

      send();
    }, [notifications, selectedLogLevel, agent.id]);

    useEffect(() => {
      if (selectedLogLevel !== agentLogLevel) {
        onClickApply();
      }
    }, [selectedLogLevel, agentLogLevel, onClickApply]);

    return (
      <>
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.fleet.agentLogs.selectLogLevelLabelText"
              defaultMessage="Agent logging level"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={5}>
            <EuiText>
              <FormattedMessage
                id="xpack.fleet.agentLogs.selectLogLevelLabelText"
                defaultMessage="Sets the log level for the agent. The default log level is {infoText}. {guideLink}"
                values={{
                  infoText: <EuiCode>info</EuiCode>,
                  guideLink: (
                    <EuiLink external={true} href={docLinks.links.fleet.agentLevelLogging}>
                      <FormattedMessage
                        id="xpack.fleet.agentLog.levelGuideLinkText"
                        defaultMessage="Learn More"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={5}>
            <EuiSelect
              disabled={isSetLevelLoading || !authz.fleet.allAgents}
              compressed={true}
              fullWidth={true}
              id="selectAgentLogLevel"
              data-test-subj="selectAgentLogLevel"
              value={selectedLogLevel}
              onChange={(event) => {
                setSelectedLogLevel(event.target.value);
              }}
              options={AGENT_LOG_LEVELS.map((level) => ({
                value: level,
                text: level,
              }))}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);
