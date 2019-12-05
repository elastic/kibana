/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiCard, EuiIcon, ICON_TYPES } from '@elastic/eui';
import styled from 'styled-components';
import { useLinks } from '../hooks';
import { PackageListItem, PackageInfo } from '../../common/types';

export interface BadgeProps {
  showInstalledBadge?: boolean;
}

type PackageCardProps = (PackageListItem | PackageInfo) & BadgeProps;

// adding the `href` causes EuiCard to use a `a` instead of a `button`
// `a` tags use `euiLinkColor` which results in blueish Badge text
const Card = styled(EuiCard)`
  color: inherit;
`;

export function PackageCard({
  description,
  name,
  title,
  version,
  showInstalledBadge,
  status,
}: PackageCardProps) {
  const { toDetailView } = useLinks();
  const url = toDetailView({ name, version });

  // try to find a logo in EUI
  // TODO: first try to find icon in `icons` property
  const iconType = ICON_TYPES.find(key => key.toLowerCase() === `logo${name}`);
  const optionalIcon = iconType ? <EuiIcon type={iconType} size="l" /> : undefined;

  return (
    <Card
      betaBadgeLabel={showInstalledBadge && status === 'installed' ? 'Installed' : ''}
      layout="horizontal"
      title={title}
      description={description}
      icon={optionalIcon}
      href={url}
    />
  );
}
