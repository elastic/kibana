/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingElastic } from '@elastic/eui';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import React, { useEffect } from 'react';
import {
  SignificantEventsAppHeader,
  SignificantEventsAppPageTemplate,
} from '../../components/page_template';
import { SignificantEventsNotEnabledPrompt } from '../../components/not_enabled_prompt';
import { useKibana } from '../../hooks/use_kibana';
import { useSignificantEventsAvailability } from '../../hooks/use_significant_events_availability';
import { SettingsTab } from '../significant_events/components/settings/tab';

const settingsTitle = i18n.translate('xpack.significantEventsApp.settingsPage.title', {
  defaultMessage: 'Settings',
});

const nightshiftLabel = i18n.translate(
  'xpack.significantEventsApp.settingsPage.backToNightshiftLabel',
  {
    defaultMessage: 'Nightshift',
  }
);

export function SettingsPage() {
  const {
    core: {
      application: {
        capabilities: { nightshift },
        getUrlForApp,
        navigateToApp,
      },
      chrome,
    },
  } = useKibana();
  const { canConfigure } = getNightshiftCapabilities(nightshift);
  const { availability, isLoading: isAvailabilityLoading } = useSignificantEventsAvailability();
  const nightshiftHref = getUrlForApp(NIGHTSHIFT_APP_ID);

  useEffect(() => {
    if (!canConfigure) {
      void navigateToApp(NIGHTSHIFT_APP_ID);
    }
  }, [canConfigure, navigateToApp]);

  useEffect(() => {
    if (canConfigure) {
      chrome.setBreadcrumbs([
        { text: nightshiftLabel, href: nightshiftHref },
        { text: settingsTitle },
      ]);
    }
  }, [canConfigure, chrome, nightshiftHref]);

  if (!canConfigure) {
    return null;
  }

  if (isAvailabilityLoading) {
    return (
      <SignificantEventsAppPageTemplate.Body grow alignment="center">
        <EuiLoadingElastic size="xxl" />
      </SignificantEventsAppPageTemplate.Body>
    );
  }

  if (!availability || !availability.available) {
    const reason =
      availability && !availability.available ? availability.reason : ('unknown' as const);
    return (
      <SignificantEventsAppPageTemplate.Body grow>
        <SignificantEventsNotEnabledPrompt reason={reason} />
      </SignificantEventsAppPageTemplate.Body>
    );
  }

  return (
    <>
      <SignificantEventsAppHeader
        title={settingsTitle}
        back={{ href: nightshiftHref, label: nightshiftLabel }}
      />
      <SignificantEventsAppPageTemplate.Body grow>
        <SettingsTab />
      </SignificantEventsAppPageTemplate.Body>
    </>
  );
}
