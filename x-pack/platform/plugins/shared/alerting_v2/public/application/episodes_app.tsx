/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Route, Routes } from '@kbn/shared-ux-router';
import { AlertEpisodesListPage } from '../pages/alert_episodes_list_page/alert_episodes_list_page';
import { EpisodeDetailsPage } from '../pages/episode_details_page/episode_details_page';
import { RequireAlertingV2Privilege } from '../components/require_alerting_v2_privilege';

export const EpisodesApp = () => {
  return (
    <RequireAlertingV2Privilege
      features={['alerts']}
      pageName={i18n.translate('xpack.alertingV2.episodesApp.pageName', {
        defaultMessage: 'Alerts',
      })}
    >
      <Routes>
        <Route exact path="/">
          <AlertEpisodesListPage />
        </Route>
        <Route path="/:episodeId">
          <EpisodeDetailsPage />
        </Route>
      </Routes>
    </RequireAlertingV2Privilege>
  );
};
