/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiCard, EuiIcon, ICON_TYPES } from '@elastic/eui';
import { useLinks } from '../hooks';
import { IntegrationListItem, IntegrationInfo } from '../../common/types';

type IntegrationCardProps = IntegrationListItem | IntegrationInfo;

export function IntegrationCard({
  description,
  name,
  version,
  icon: iconUrl,
}: IntegrationCardProps) {
  const { toDetailView } = useLinks();
  const url = toDetailView({ name, version });

  // TODO: Need title or something which uses correct capitalization (e.g. PostgreSQL)
  const title = description.split(' ')[0];

  // try to find a logo in EUI
  const iconType = ICON_TYPES.find(key => key.toLowerCase() === `logo${name}`);

  let optionalIcon;
  if (iconType) {
    optionalIcon = <EuiIcon type={iconType} size="l" />;
  } else if (iconUrl) {
    // skipping b/c images from registry are Not Good
    // no consistency re: sizing / format
    // most are placeholders of broken/missing image used in browsers
    // also, EuiCard doesn't treat <img> the same as svg
    // and matted (extra whitespace around sides) so they look very bad next to icons
    // TODO: Open issue/discussion in registry repo re: above items
    // and possibly supporting EUI icon types
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
      layout="horizontal"
      title={title}
      description={description}
      icon={optionalIcon}
      href={url}
    />
  );
}
