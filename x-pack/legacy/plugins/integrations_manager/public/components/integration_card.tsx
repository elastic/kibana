/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiCard, EuiIcon, ICON_TYPES } from '@elastic/eui';
import { useLinks } from '../hooks';
import { IntegrationListItem, IntegrationInfo } from '../../common/types';

export interface BadgeProps {
  showInstalledBadge?: boolean;
}

type IntegrationCardProps = (IntegrationListItem | IntegrationInfo) & BadgeProps;

export function IntegrationCard({
  description,
  name,
  title,
  version,
  icon: iconUrl,
  showInstalledBadge,
  status,
}: IntegrationCardProps) {
  const { toDetailView } = useLinks();
  const url = toDetailView({ name, version });

  // try to find a logo in EUI
  const iconType = ICON_TYPES.find(key => key.toLowerCase() === `logo${name}`);

  let optionalIcon;
  if (iconType) {
    optionalIcon = <EuiIcon type={iconType} size="l" />;
  } else if (iconUrl) {
    // skipping b/c images from registry are Not Good
    // https://github.com/elastic/integrations-registry/issues/45
    // optionalIcon = (
    //   <img
    //     width="24"
    //     height="24"
    //     src={`http://integrations-registry.app.elstc.co${iconUrl}`}
    //     alt={`${name} icon`}
    //   />
    // );
  }

  return (
    <EuiCard
      betaBadgeLabel={showInstalledBadge && status === 'installed' ? 'Installed' : ''}
      layout="horizontal"
      title={title}
      description={description}
      icon={optionalIcon}
      href={url}
    />
  );
}
