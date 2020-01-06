/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { I18nContext } from 'ui/i18n';
import { BASE_PATH } from '../common/constants';
import { compose } from './lib/compose/kibana';
import { FrontendLibs } from './lib/types';
import { AppRoutes } from './routes';
import { LibsContext } from './hooks';

async function startApp(libs: FrontendLibs) {
  libs.framework.renderUIAtPath(
    BASE_PATH,
    <I18nContext>
      <HashRouter basename={BASE_PATH}>
        <LibsContext.Provider value={libs}>
          <AppRoutes />
        </LibsContext.Provider>
      </HashRouter>
    </I18nContext>,
    'management'
  );

  await libs.framework.waitUntilFrameworkReady();

  if (libs.framework.licenseIsAtLeast('standard')) {
    libs.framework.registerManagementSection({
      id: 'ingest',
      name: i18n.translate('xpack.fleet.fleetSectionLabel', {
        defaultMessage: 'Agents/Policies',
      }),
      iconName: 'logoBeats',
    });
    libs.framework.registerManagementUI({
      sectionId: 'ingest',
      id: 'ingest_fleet',
      name: i18n.translate('xpack.fleet.fleetManagementLinkLabel', {
        defaultMessage: 'Fleet',
      }),
      basePath: `/ingest/agents`,
    });
    libs.framework.registerManagementUI({
      sectionId: 'ingest',
      id: 'ingest_policies',
      name: i18n.translate('xpack.fleet.policyManagementLinkLabel', {
        defaultMessage: 'Policies',
      }),
      basePath: `/ingest/policies`,
    });
  }
}

startApp(compose());
