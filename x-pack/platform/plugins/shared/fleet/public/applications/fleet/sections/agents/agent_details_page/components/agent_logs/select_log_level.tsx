/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSelect,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiText,
  EuiCode,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';
import semverGte from 'semver/functions/gte';

import type { Agent } from '../../../../../types';
import { sendPostAgentAction, useAuthz, useStartServices } from '../../../../../hooks';

import { AGENT_LOG_LEVELS, DEFAULT_LOG_LEVEL } from '../../../../../../../../common/constants';

export const SelectLogLevel: React.FC<{ agent: Agent; agentPolicyLogLevel?: string }> = memo(
  ({ agent, agentPolicyLogLevel = DEFAULT_LOG_LEVEL }) => {
    const authz = useAuthz();
    const { notifications, docLinks } = useStartServices();
    const [isSetLevelLoading, setIsSetLevelLoading] = useState(false);
    const [isResetLevelLoading, setIsResetLevelLoading] = useState(false);
    const canResetLogLevel = semverGte(
      agent.local_metadata?.elastic?.agent?.version,
      '8.15.0',
      true
    );

    const reportedLogLevel = agent.local_metadata?.elastic?.agent?.log_level ?? agentPolicyLogLevel;

    const [agentLogLevel, setAgentLogLevel] = useState(reportedLogLevel);
    const [selectedLogLevel, setSelectedLogLevel] = useState(agentLogLevel);
    const pendingLogLevelRef = useRef<string | null>(null);

    // Sync dropdown to Fleet-reported log level when polling updates,
    // don't overwrite during apply/reset or while awaiting agent metadata.
    useEffect(() => {
      if (isSetLevelLoading || isResetLevelLoading) {
        return;
      }
      if (selectedLogLevel !== agentLogLevel) {
        return;
      }
      if (pendingLogLevelRef.current !== null && reportedLogLevel !== pendingLogLevelRef.current) {
        return;
      }
      if (pendingLogLevelRef.current !== null && reportedLogLevel === pendingLogLevelRef.current) {
        pendingLogLevelRef.current = null;
      }
      setAgentLogLevel(reportedLogLevel);
      setSelectedLogLevel(reportedLogLevel);
    }, [reportedLogLevel, isSetLevelLoading, isResetLevelLoading, selectedLogLevel, agentLogLevel]);

    const resetLogLevel = useCallback(() => {
      setIsResetLevelLoading(true);
      pendingLogLevelRef.current = agentPolicyLogLevel;
      async function send() {
        try {
          const res = await sendPostAgentAction(agent.id, {
            action: {
              type: 'SETTINGS',
              data: {
                log_level: null,
              },
            },
          });
          if (res.error) {
            throw res.error;
          }

          // TODO: reset to an empty state?
          setAgentLogLevel(agentPolicyLogLevel);
          setSelectedLogLevel(agentPolicyLogLevel);

          notifications.toasts.addSuccess(
            i18n.translate('xpack.fleet.agentLogs.resetLogLevel.successText', {
              defaultMessage: `Reset agent logging level to policy`,
            })
          );
        } catch (error) {
          pendingLogLevelRef.current = null;
          notifications.toasts.addError(error, {
            title: i18n.translate('xpack.fleet.agentLogs.resetLogLevel.errorTitleText', {
              defaultMessage: 'Error resetting agent logging level',
            }),
          });
        }
        setIsResetLevelLoading(false);
      }

      send();
    }, [agent.id, agentPolicyLogLevel, notifications]);

    const onClickApply = useCallback(() => {
      setIsSetLevelLoading(true);
      pendingLogLevelRef.current = selectedLogLevel;
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
          pendingLogLevelRef.current = null;
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
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText>
              <FormattedMessage
                id="xpack.fleet.agentLogs.selectLogLevelLabelText"
                defaultMessage="Sets the log level for the agent. The default log level is {infoText}. {guideLink}"
                values={{
                  infoText: <EuiCode>info</EuiCode>,
                  guideLink: (
                    <EuiLink
                      target="_blank"
                      external={true}
                      href={docLinks.links.fleet.agentLevelLogging}
                    >
                      <FormattedMessage
                        id="xpack.fleet.agentLogs.levelGuideLinkText"
                        defaultMessage="Learn More"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSelect
              disabled={isSetLevelLoading || !authz.fleet.allAgents}
              compressed={true}
              fullWidth={true}
              id="selectAgentLogLevel"
              data-test-subj="selectAgentLogLevel"
              aria-label={i18n.translate('xpack.fleet.agentLogs.selectLogLevel.ariaLabel', {
                defaultMessage: 'Agent log level',
              })}
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
          {canResetLogLevel && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                flush="both"
                size="xs"
                disabled={!authz.fleet.allAgents}
                isLoading={isSetLevelLoading || isResetLevelLoading}
                iconType="cross"
                onClick={resetLogLevel}
                data-test-subj="resetLogLevelBtn"
              >
                <FormattedMessage
                  id="xpack.fleet.agentLogs.resetLogLevelLabelText"
                  defaultMessage="Reset to policy"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </>
    );
  }
);
