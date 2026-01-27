/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiLink,
  EuiProgress,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';

interface ActiveToolsStatusProps {
  activeToolsCount: number;
  warningThreshold: number;
}

export const ActiveToolsStatus: React.FC<ActiveToolsStatusProps> = ({
  activeToolsCount,
  warningThreshold,
}) => {
  const { createAgentBuilderUrl } = useNavigation();
  const isOverThreshold = activeToolsCount > warningThreshold;
  const isZeroTools = activeToolsCount === 0;
  const shouldShowWarning = isOverThreshold || isZeroTools;

  const statusColor = shouldShowWarning ? 'warning' : 'success';
  const iconType = shouldShowWarning ? 'alert' : 'checkInCircleFilled';

  const statusMessage = shouldShowWarning
    ? i18n.translate('xpack.agentBuilder.activeToolsStatus.warningStatusMessage', {
        defaultMessage: 'Warning status: {count} active tools',
        values: { count: activeToolsCount },
      })
    : i18n.translate('xpack.agentBuilder.activeToolsStatus.goodStatusMessage', {
        defaultMessage: 'Good status: {count} active tools',
        values: { count: activeToolsCount },
      });

  return (
    <EuiPanel
      hasBorder={true}
      hasShadow={false}
      paddingSize="m"
      aria-label={i18n.translate('xpack.agentBuilder.activeToolsStatus.panelLabel', {
        defaultMessage: 'Active tools status panel',
      })}
      role="region"
    >
      <EuiFlexGroup alignItems="center" gutterSize="l">
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type={iconType}
                    color={statusColor}
                    size="m"
                    aria-label={
                      shouldShowWarning
                        ? i18n.translate('xpack.agentBuilder.activeToolsStatus.warningStatusIcon', {
                            defaultMessage: 'Warning status icon',
                          })
                        : i18n.translate('xpack.agentBuilder.activeToolsStatus.successStatusIcon', {
                            defaultMessage: 'Success status icon',
                          })
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="m" color={statusColor}>
                    <strong aria-label={statusMessage}>
                      {i18n.translate('xpack.agentBuilder.activeToolsStatus.title', {
                        defaultMessage: 'This agent has {count} active tools',
                        values: { count: activeToolsCount },
                      })}
                    </strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.agentBuilder.activeToolsStatus.description"
                  defaultMessage="{toolsLink} enable agents to work with your data. For best results, keep the selection under {threshold} to avoid overwhelming your agent with too many options."
                  values={{
                    toolsLink: (
                      <EuiLink href={createAgentBuilderUrl(appPaths.tools.list)}>
                        {i18n.translate('xpack.agentBuilder.activeToolsStatus.toolsLinkText', {
                          defaultMessage: 'Tools',
                        })}
                      </EuiLink>
                    ),
                    threshold: warningThreshold,
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiProgress
                value={activeToolsCount}
                max={warningThreshold}
                color={statusColor}
                size="m"
                label={i18n.translate('xpack.agentBuilder.activeToolsStatus.progressLabel', {
                  defaultMessage: 'Active tools',
                })}
                valueText={`${activeToolsCount}/${warningThreshold}`}
                aria-label={i18n.translate(
                  'xpack.agentBuilder.activeToolsStatus.progressAriaLabel',
                  {
                    defaultMessage: 'Progress: {current} out of {max} active tools',
                    values: { current: activeToolsCount, max: warningThreshold },
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
