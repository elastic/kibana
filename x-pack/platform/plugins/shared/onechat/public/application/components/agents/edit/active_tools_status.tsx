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

interface ActiveToolsStatusProps {
  activeToolsCount: number;
  warningThreshold: number;
}

export const ActiveToolsStatus: React.FC<ActiveToolsStatusProps> = ({
  activeToolsCount,
  warningThreshold,
}) => {
  const isOverThreshold = activeToolsCount > warningThreshold;
  const isZeroTools = activeToolsCount === 0;
  const shouldShowWarning = isOverThreshold || isZeroTools;

  const statusColor = shouldShowWarning ? 'warning' : 'success';
  const iconType = shouldShowWarning ? 'alert' : 'checkInCircleFilled';

  const statusMessage = shouldShowWarning
    ? i18n.translate('xpack.onechat.activeToolsStatus.warningStatusMessage', {
        defaultMessage: 'Warning status: {count} active tools',
        values: { count: activeToolsCount },
      })
    : i18n.translate('xpack.onechat.activeToolsStatus.goodStatusMessage', {
        defaultMessage: 'Good status: {count} active tools',
        values: { count: activeToolsCount },
      });

  return (
    <EuiPanel
      hasBorder={true}
      hasShadow={false}
      paddingSize="m"
      aria-label={i18n.translate('xpack.onechat.activeToolsStatus.panelLabel', {
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
                        ? i18n.translate('xpack.onechat.activeToolsStatus.warningStatusIcon', {
                            defaultMessage: 'Warning status icon',
                          })
                        : i18n.translate('xpack.onechat.activeToolsStatus.successStatusIcon', {
                            defaultMessage: 'Success status icon',
                          })
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="m" color={statusColor}>
                    <strong aria-label={statusMessage}>
                      {i18n.translate('xpack.onechat.activeToolsStatus.title', {
                        defaultMessage: 'You have {count} active tools',
                        values: { count: activeToolsCount },
                      })}
                    </strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.onechat.activeToolsStatus.description', {
                  defaultMessage:
                    'Tools are the skills your agent can use to get things done. For best results, try to keep the list under {threshold} — it helps your agent stay focused and respond more clearly.',
                  values: { threshold: warningThreshold },
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink
                href="#"
                aria-label={i18n.translate('xpack.onechat.activeToolsStatus.learnMoreAriaLabel', {
                  defaultMessage: 'Learn more about active tools management',
                })}
              >
                <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                  {i18n.translate('xpack.onechat.activeToolsStatus.learnMore', {
                    defaultMessage: 'Learn more',
                  })}
                  <EuiIcon
                    type="popout"
                    aria-label={i18n.translate('xpack.onechat.activeToolsStatus.externalLinkIcon', {
                      defaultMessage: 'External link',
                    })}
                  />
                </EuiFlexGroup>
              </EuiLink>
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
                label={i18n.translate('xpack.onechat.activeToolsStatus.progressLabel', {
                  defaultMessage: 'Active tools',
                })}
                valueText={`${activeToolsCount}/${warningThreshold}`}
                aria-label={i18n.translate('xpack.onechat.activeToolsStatus.progressAriaLabel', {
                  defaultMessage: 'Progress: {current} out of {max} active tools',
                  values: { current: activeToolsCount, max: warningThreshold },
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
