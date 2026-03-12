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
  EuiIconTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';
import { useCloudConnectedAppContext } from '../../../app_context';
import type { ServiceType } from '../../../../types';

export interface ServiceCardProps {
  serviceKey?: string;
  title: string;
  enabled: boolean;
  supported?: boolean;
  badge?: string;
  badgeTooltip?: string;
  region?: string;
  description: string;
  learnMoreUrl?: string;
  serviceUrl?: string;
  enableServiceByUrl?: string;
  onEnable?: () => void;
  onDisable?: () => void;
  onOpen?: () => void;
  onRotateApiKey?: () => void;
  isLoading?: boolean;
  isCardDisabled?: boolean;
  subscriptionRequired?: boolean;
  hasActiveSubscription?: boolean;
  validLicenseTypes?: string[];
  currentLicenseType?: string;
}

const isLicenseValid = (
  validLicenseTypes: string[] | undefined,
  currentLicenseType: string | undefined
): boolean => {
  // If no license requirements, it's valid
  if (!validLicenseTypes || validLicenseTypes.length === 0) {
    return true;
  }
  // If no current license type, consider it valid
  if (!currentLicenseType) {
    return true;
  }

  return validLicenseTypes.includes(currentLicenseType);
};

const formatLicenseList = (licenses: string[]): string => {
  const formatted = licenses.map((license) =>
    license.toLowerCase() === 'trial' ? 'trial' : capitalize(license)
  );

  if (formatted.length === 1) {
    return formatted[0];
  }

  if (formatted.length === 2) {
    return `${formatted[0]} or ${formatted[1]}`;
  }

  // For 3 or more items: "trial, Basic or Enterprise"
  const allButLast = formatted.slice(0, -1).join(', ');
  const last = formatted[formatted.length - 1];

  return `${allButLast} or ${last}`;
};

export const ServiceCard: React.FC<ServiceCardProps> = ({
  serviceKey,
  title,
  enabled,
  supported = true,
  badge,
  badgeTooltip,
  region,
  description,
  learnMoreUrl,
  serviceUrl,
  enableServiceByUrl,
  onEnable,
  onDisable,
  onOpen,
  onRotateApiKey,
  isLoading = false,
  isCardDisabled = false,
  subscriptionRequired = false,
  hasActiveSubscription = true,
  validLicenseTypes,
  currentLicenseType,
}) => {
  const { hasConfigurePermission, telemetryService } = useCloudConnectedAppContext();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isLicensePopoverOpen, setIsLicensePopoverOpen] = useState(false);

  const closePopover = () => setIsPopoverOpen(false);
  const togglePopover = () => setIsPopoverOpen(!isPopoverOpen);
  const closeLicensePopover = () => setIsLicensePopoverOpen(false);
  const toggleLicensePopover = () => setIsLicensePopoverOpen(!isLicensePopoverOpen);

  const renderBadge = () => {
    if (isCardDisabled && badge) {
      return <EuiBetaBadge size="s" label={badge} data-test-subj="serviceCardComingSoonBadge" />;
    }

    if (!supported) {
      const unsupportedBadge = (
        <EuiBadge color="hollow" data-test-subj="serviceCardUnsupportedBadge">
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
      return (
        <EuiBadge color="hollow" data-test-subj="serviceCardCustomBadge">
          {badge}
        </EuiBadge>
      );
    }

    return (
      <EuiBadge
        color={enabled ? 'success' : 'subdued'}
        data-test-subj={enabled ? 'serviceCardEnabledBadge' : 'serviceCardDisabledBadge'}
      >
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
    if (isCardDisabled) {
      return null;
    }

    if (!isLicenseValid(validLicenseTypes, currentLicenseType) && !supported) {
      const formattedLicenses = formatLicenseList(validLicenseTypes!);

      return (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          data-test-subj="serviceCardLicenseMessage"
        >
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.cloudConnect.connectedServices.service.requiresDifferentLicense"
                defaultMessage="Requires {licenses} license"
                values={{ licenses: formattedLicenses }}
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButtonIcon
                  iconType="info"
                  color="text"
                  aria-label={i18n.translate(
                    'xpack.cloudConnect.connectedServices.service.licenseInfoAriaLabel',
                    {
                      defaultMessage: 'License information',
                    }
                  )}
                  onClick={toggleLicensePopover}
                  data-test-subj="serviceCardLicenseInfoButton"
                />
              }
              isOpen={isLicensePopoverOpen}
              closePopover={closeLicensePopover}
              panelPaddingSize="s"
              anchorPosition="upCenter"
            >
              <div style={{ maxWidth: '300px' }}>
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.cloudConnect.connectedServices.service.licenseInfo"
                    defaultMessage="{viewSubscriptionLink} or {extendTrialLink}."
                    values={{
                      extendTrialLink: (
                        <EuiLink href="https://www.elastic.co/trialextension" target="_blank">
                          {i18n.translate(
                            'xpack.cloudConnect.connectedServices.service.extendTrial',
                            {
                              defaultMessage: 'extend your trial',
                            }
                          )}
                        </EuiLink>
                      ),
                      viewSubscriptionLink: (
                        <EuiLink href="https://www.elastic.co/subscriptions" target="_blank">
                          {i18n.translate(
                            'xpack.cloudConnect.connectedServices.service.viewSubscriptionOptions',
                            {
                              defaultMessage: 'View subscription options',
                            }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiText>
              </div>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (!supported) {
      return null;
    }

    // Show subscription requirement message if service requires subscription and there's no active subscription
    if (subscriptionRequired && !hasActiveSubscription) {
      return (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          data-test-subj="serviceCardSubscriptionMessage"
        >
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.cloudConnect.connectedServices.service.requiresSubscription"
                defaultMessage="Requires an active cloud subscription"
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.translate(
                'xpack.cloudConnect.connectedServices.service.subscriptionInfo',
                {
                  defaultMessage: 'Contact your admin to subscribe to Elastic Cloud.',
                }
              )}
              position="top"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    // Show permission message if user doesn't have configure permission
    if (!hasConfigurePermission) {
      return (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          data-test-subj="serviceCardPermissionMessage"
        >
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.cloudConnect.connectedServices.service.onlyAdminsCanManage"
                defaultMessage="Only admins can manage services"
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.translate('xpack.cloudConnect.connectedServices.service.contactAdmin', {
                defaultMessage: 'Contact your admin',
              })}
              position="top"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
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
        ...(onRotateApiKey
          ? [
              <EuiContextMenuItem
                key="rotate"
                onClick={() => {
                  closePopover();
                  onRotateApiKey();
                }}
              >
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.cloudConnect.connectedServices.service.rotateApiKey"
                    defaultMessage="Rotate API key"
                  />
                </EuiText>
              </EuiContextMenuItem>,
            ]
          : []),
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
          {serviceUrl && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                href={serviceUrl}
                target="_blank"
                iconSide="right"
                iconType="popout"
                onClick={() => {
                  // Track telemetry for opening service
                  if (serviceKey) {
                    telemetryService.trackLinkClicked({
                      destination_type: 'service_portal',
                      service_type: serviceKey as ServiceType,
                    });
                  }
                  if (onOpen) {
                    onOpen();
                  }
                }}
                disabled={isLoading}
                isLoading={isLoading}
                data-test-subj="serviceCardOpenButton"
              >
                <FormattedMessage
                  id="xpack.cloudConnect.connectedServices.service.open"
                  defaultMessage="Open"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={moreActionsButton}
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
              anchorPosition="downRight"
              data-test-subj="serviceCardMoreActionsPopover"
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
          data-test-subj="serviceCardConnectButton"
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
        data-test-subj="serviceCardConnectButton"
      >
        <FormattedMessage
          id="xpack.cloudConnect.connectedServices.service.connect"
          defaultMessage="Connect"
        />
      </EuiButtonEmpty>
    );
  };

  return (
    <EuiPanel hasBorder paddingSize="l" color={isCardDisabled ? 'subdued' : 'plain'}>
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
          <EuiText size="s" color="subdued">
            {description}{' '}
            {learnMoreUrl && (
              <EuiLink
                href={learnMoreUrl}
                target="_blank"
                external
                onClick={() => {
                  // Track telemetry for learn more link
                  if (serviceKey) {
                    telemetryService.trackLinkClicked({
                      destination_type: 'service_documentation',
                      service_type: serviceKey as ServiceType,
                    });
                  }
                }}
              >
                <FormattedMessage
                  id="xpack.cloudConnect.connectedServices.service.learnMore"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            )}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>{renderActions()}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
