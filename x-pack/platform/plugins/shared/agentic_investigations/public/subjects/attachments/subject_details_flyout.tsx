/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { AlertEpisodeDetailsFlyout } from '@kbn/alerting-v2-episodes-ui/components/details/details_flyout';
import { ClassicAlertDetailsFlyout } from './classic_alert_details_flyout';
import type { SubjectFlyoutServices } from './subject_services';
import { hasEpisodeFlyoutServices } from './subject_services';

export interface SubjectDetailsFlyoutProps {
  /** `kibana.alert.uuid` of a classic alert, or the episode id of an alerting v2 alert. */
  alertId: string;
  /** `snapshot.alert_version`; `v2` is an alerting v2 episode. */
  alertVersion?: string;
  /** The subject's details page, shown as the flyout's "View details" link. */
  detailsHref?: string;
  onClose: () => void;
  services: SubjectFlyoutServices;
}

/**
 * One query client per flyout: the episode flyout and the classic alert fetch below are the only
 * consumers, so their cache lives and dies with the flyout.
 */
const createQueryClient = (): QueryClient =>
  new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });

/**
 * The alert behind a subject, in a flyout: the shared alerting v2 episode flyout for a v2
 * episode, a thin classic-alert flyout otherwise. Both keep a link to the full details page.
 */
export const SubjectDetailsFlyout = ({
  alertId,
  alertVersion,
  detailsHref,
  onClose,
  services,
}: SubjectDetailsFlyoutProps) => {
  // Created once per mount; the flyout is unmounted when it closes.
  const [queryClient] = React.useState(createQueryClient);

  if (alertVersion === 'v2') {
    if (!hasEpisodeFlyoutServices(services)) {
      return null;
    }
    const {
      http,
      uiSettings,
      userProfile,
      data,
      dataViews,
      expressions,
      spaces,
      unifiedDocViewer,
    } = services;
    return (
      <QueryClientProvider client={queryClient}>
        <AlertEpisodeDetailsFlyout
          episodeId={alertId}
          groupHash={undefined}
          onClose={onClose}
          getRuleDetailsHref={() => ''}
          getEpisodeDetailsHref={() => detailsHref ?? ''}
          services={{
            http,
            uiSettings,
            userProfile,
            data,
            dataViews,
            expressions,
            spaces,
            unifiedDocViewer,
          }}
        />
      </QueryClientProvider>
    );
  }

  if (!services.http) {
    return null;
  }
  return (
    <QueryClientProvider client={queryClient}>
      <ClassicAlertDetailsFlyout
        alertId={alertId}
        detailsHref={detailsHref}
        onClose={onClose}
        services={{ http: services.http }}
      />
    </QueryClientProvider>
  );
};
