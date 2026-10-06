/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppHeaderBadge,
  AppHeaderDescription,
  AppHeaderMenu,
  AppHeaderTab,
} from '@kbn/app-header';
import { APP_HEADER_TEST_SUBJECTS, AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import type { MouseEventHandler } from 'react';
import React, { useCallback } from 'react';

export const CONTEXT_ENGINE_BACK_BUTTON_TEST_SUBJ = APP_HEADER_TEST_SUBJECTS.back;

/** AppHeader back control prefixes this with “Back to” for tooltip and aria-label. */
export const contextEngineBackDestinationLabel = i18n.translate(
  'xpack.contextEngine.navigation.backDestination',
  {
    defaultMessage: 'Context',
  }
);

interface ContextEngineLandingHeaderProps {
  pageTitle: string;
  description: AppHeaderDescription;
  menu?: AppHeaderMenu;
  docLink?: string;
}

export const ContextEngineLandingHeader = ({
  pageTitle,
  description,
  menu,
  docLink,
}: ContextEngineLandingHeaderProps) => (
  <AppHeader title={pageTitle} description={description} menu={menu} docLink={docLink} />
);

interface ContextEngineSubPageHeaderProps {
  backDestinationLabel: string;
  backHref: string;
  onBackClick?: MouseEventHandler;
  pageTitle: string;
  description?: AppHeaderDescription;
  badges?: AppHeaderBadge[];
  tabs?: AppHeaderTab[];
  menu?: AppHeaderMenu;
}

export const ContextEngineSubPageHeader = ({
  backDestinationLabel,
  backHref,
  onBackClick,
  pageTitle,
  description,
  badges,
  tabs,
  menu,
}: ContextEngineSubPageHeaderProps) => {
  const handleBackClick = useCallback<MouseEventHandler>(
    (event) => {
      onBackClick?.(event);
    },
    [onBackClick]
  );

  return (
    <AppHeader
      title={pageTitle}
      description={description}
      badges={badges}
      tabs={tabs}
      menu={menu}
      back={{ href: backHref, label: backDestinationLabel, onClick: handleBackClick }}
    />
  );
};
