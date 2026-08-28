/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type {
  AppHeaderBack,
  AppHeaderBadge,
  AppHeaderDescription,
  AppHeaderMetadataItems,
  AppHeaderTab,
  AppHeaderTitle,
  AppHeaderMenu,
} from '@kbn/app-header';

export interface MlAppHeaderProps {
  title: AppHeaderTitle;
  back?: AppHeaderBack;
  menu?: AppHeaderMenu;
  tabs?: AppHeaderTab[];
  badges?: AppHeaderBadge[];
  description?: AppHeaderDescription;
  metadata?: AppHeaderMetadataItems;
  docLink?: string;
}

export const MlAppHeader: FC<MlAppHeaderProps> = ({
  title,
  back,
  menu,
  tabs,
  badges,
  description,
  metadata,
  docLink,
}) => {
  const secondaryContent = description ? { description } : metadata ? { metadata } : {};

  return (
    <>
      <AppHeader
        title={title}
        back={back}
        menu={menu}
        tabs={tabs}
        badges={badges}
        {...secondaryContent}
        spacing="bleed"
        docLink={docLink}
      />
      <EuiSpacer size="m" />
    </>
  );
};
