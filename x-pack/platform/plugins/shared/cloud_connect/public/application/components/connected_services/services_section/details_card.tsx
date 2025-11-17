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
  EuiTitle,
  EuiBadge,
  EuiBetaBadge,
  EuiText,
  EuiLink,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface ServiceCardProps {
  title: string;
  enabled: boolean;
  badge?: string;
  region?: string;
  description: string;
  learnMoreUrl: string;
  onAction?: () => void;
  actionLabel?: string;
  isCardDisabled?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  enabled,
  badge,
  region,
  description,
  learnMoreUrl,
  onAction,
  actionLabel,
  isCardDisabled = false,
}) => {
  return (
    <EuiPanel hasBorder paddingSize="m" color={isCardDisabled ? 'subdued' : 'plain'}>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isCardDisabled && badge ? (
                <EuiBetaBadge size="s" label={badge} />
              ) : badge ? (
                <EuiBadge color="hollow">{badge}</EuiBadge>
              ) : (
                <EuiBadge color={enabled ? 'success' : 'hollow'}>
                  {enabled ? (
                    <FormattedMessage
                      id="xpack.cloudConnect.connectedServices.service.enabled"
                      defaultMessage="Enabled"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.cloudConnect.connectedServices.service.notEnabled"
                      defaultMessage="Not enabled"
                    />
                  )}
                </EuiBadge>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>

          {region && (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                {region}
              </EuiText>
            </>
          )}

          <EuiSpacer size="s" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.cloudConnect.connectedServices.service.description"
              defaultMessage="{description} {learnMore}"
              values={{
                description,
                learnMore: (
                  <EuiLink href={learnMoreUrl} target="_blank" external>
                    <FormattedMessage
                      id="xpack.cloudConnect.connectedServices.service.learnMore"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </EuiFlexItem>

        {!isCardDisabled && (
          <EuiFlexItem grow={false}>
            {enabled ? (
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton size="s" onClick={onAction} disabled={!onAction}>
                    {actionLabel}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="boxesHorizontal"
                    aria-label="More actions"
                    size="s"
                    display="base"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiButtonEmpty size="s" onClick={onAction} disabled={!onAction}>
                {actionLabel}
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
