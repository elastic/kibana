/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type {
  AppHeaderBack,
  AppHeaderBadge,
  AppHeaderMetadataItems,
  AppHeaderSpacing,
  AppHeaderTab,
  AppHeaderTitle,
  AppHeaderMenu,
} from '@kbn/app-header';
import { MlPageControlsContext } from '../ml_page/ml_page';
import { MlDatePickerBar } from './ml_date_picker_bar';

export interface MlAppHeaderProps {
  title: AppHeaderTitle;
  back?: AppHeaderBack;
  menu?: AppHeaderMenu;
  tabs?: AppHeaderTab[];
  badges?: AppHeaderBadge[];
  metadata?: AppHeaderMetadataItems;
  showDatePicker?: boolean;
  spacing?: AppHeaderSpacing;
  docLink?: string;
}

export const MlAppHeader: FC<MlAppHeaderProps> = ({
  title,
  back,
  menu,
  tabs,
  badges,
  metadata,
  showDatePicker = false,
  spacing,
  docLink,
}) => {
  const { isManagementMode } = useContext(MlPageControlsContext);
  // Management pages use the standard 16px inset; elsewhere bleed into a 24px-padded parent.
  const resolvedSpacing = spacing ?? (isManagementMode ? 'standard' : 'largeBleed');

  return (
    <>
      <AppHeader
        title={title}
        back={back}
        menu={menu}
        tabs={tabs}
        badges={badges}
        metadata={metadata}
        spacing={resolvedSpacing}
        docLink={docLink}
        sticky={false}
        // @ts-expect-error - titleAppend is restricted to internal props but we do want the time picker here
        titleAppend={showDatePicker ? <MlDatePickerBar /> : undefined}
      />
      <EuiSpacer size="m" />
    </>
  );
};
