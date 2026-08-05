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
  metadata?: AppHeaderMetadataItems;
  docLink?: string;
}

export const MlAppHeader: FC<MlAppHeaderProps> = ({
  title,
  back,
  menu,
  tabs,
  badges,
  metadata,
  docLink,
}) => {
  return (
    <>
      <AppHeader
        title={title}
        back={back}
        menu={menu}
        tabs={tabs}
        badges={badges}
        metadata={metadata}
        spacing="bleed"
        docLink={docLink}
        sticky={false}
      />
      <EuiSpacer size="m" />
    </>
  );
};
