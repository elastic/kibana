/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiBadge,
  EuiBetaBadge,
  EuiText,
  EuiLink,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiSpacer,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export interface ServiceCardProps {
  title: string;
  enabled: boolean;
  supported?: boolean;
  badge?: string;
  badgeTooltip?: string;
  region?: string;
  description: string;
  learnMoreUrl: string;
  enableServiceByUrl?: string;
  onEnable?: () => void;
  onDisable?: () => void;
  onOpen?: () => void;
  isLoading?: boolean;
  isCardDisabled?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  enabled,
  supported = true,
  badge,
  badgeTooltip,
  region,
  description,
  learnMoreUrl,
  enableServiceByUrl,
  onEnable,
  onDisable,
  onOpen,
  isLoading = false,
  isCardDisabled = false,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = () => setIsPopoverOpen(false);
  const togglePopover = () => setIsPopoverOpen(!isPopoverOpen);

  const renderBadge = () => {
    if (isCardDisabled && badge) {
      return <EuiBetaBadge size="s" label={badge} />;
    }

    if (!supported) {
      const unsupportedBadge = (
        <EuiBadge color="hollow">
          <FormattedMessage
            id="xpack.cloudConnect.connectedServices.service.unsupported"
            defaultMessage="Unsupported"
          />
        </EuiBadge>
      );

      if (badgeTooltip) {
        return <EuiToolTip content={badgeTooltip}>{unsupportedBadge}</EuiToolTip>;
      }

      return unsupportedBadge;
    }

    if (badge) {
      return <EuiBadge color="hollow">{badge}</EuiBadge>;
    }

    return (
      <EuiBadge color={enabled ? 'success' : 'subdued'}>
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
    );
  };

  const renderActions = () => {
    if (isCardDisabled || !supported) {
      return null;
    }

    if (enabled) {
      const moreActionsButton = (
        <EuiButtonIcon
          iconType="boxesHorizontal"
          aria-label={i18n.translate('xpack.cloudConnect.connectedServices.service.moreActions', {
            defaultMessage: 'More actions',
          })}
          size="s"
          display="empty"
          onClick={togglePopover}
          isLoading={isLoading}
        />
      );

      const menuItems = [
        <EuiContextMenuItem
          key="disable"
          onClick={() => {
            closePopover();
            if (onDisable) {
              onDisable();
            }
          }}
        >
          <EuiText size="s" color="danger">
            <FormattedMessage
              id="xpack.cloudConnect.connectedServices.service.disable"
              defaultMessage="Disable service"
            />
          </EuiText>
        </EuiContextMenuItem>,
      ];

      return (
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              href="https://cloud.elastic.co/deployments"
              target="_blank"
              iconSide="right"
              iconType="popout"
              onClick={onOpen}
              disabled={!onOpen || isLoading}
              isLoading={isLoading}
            >
              <FormattedMessage
                id="xpack.cloudConnect.connectedServices.service.open"
                defaultMessage="Open"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={moreActionsButton}
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
              anchorPosition="downRight"
            >
              <EuiContextMenuPanel items={menuItems} />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    // Show external link icon if service is enabled via URL
    if (enableServiceByUrl) {
      return (
        <EuiButtonEmpty
          size="s"
          onClick={onEnable}
          disabled={!onEnable || isLoading}
          isLoading={isLoading}
          iconType="popout"
          iconSide="right"
        >
          <FormattedMessage
            id="xpack.cloudConnect.connectedServices.service.connect"
            defaultMessage="Connect"
          />
        </EuiButtonEmpty>
      );
    }

    return (
      <EuiButtonEmpty
        size="s"
        onClick={onEnable}
        disabled={!onEnable || isLoading}
        isLoading={isLoading}
      >
        <FormattedMessage
          id="xpack.cloudConnect.connectedServices.service.connect"
          defaultMessage="Connect"
        />
      </EuiButtonEmpty>
    );
  };

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
            <EuiFlexItem grow={false}>{renderBadge()}</EuiFlexItem>
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

        <EuiFlexItem grow={false}>{renderActions()}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
