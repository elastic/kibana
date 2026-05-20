import React from 'react';
import type { IntegrationCardItem } from '../screens/home';
export type PackageCardProps = IntegrationCardItem;
export declare function PackageCard({ description, name, title, version, type, icons, integration, url, release, id, fromIntegrations, isReauthorizationRequired, isUnverified, isUpdateAvailable, isDeprecated, showLabels, showInstallationStatus, showCompressedInstallationStatus, extraLabelsBadges, isQuickstart, installStatus, onCardClick: onClickProp, isCollectionCard, titleLineClamp, titleBadge, titleSize, descriptionLineClamp, maxCardHeight, minCardHeight, showDescription, showReleaseBadge, hasDataStreams, }: PackageCardProps): React.JSX.Element;
