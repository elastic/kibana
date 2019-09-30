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

async function startApp(libs: FrontendLibs) {
  libs.framework.renderUIAtPath(
    BASE_PATH,
    <I18nContext>
      <HashRouter basename="/fleet">
        <AppRoutes libs={libs} />
      </HashRouter>
    </I18nContext>,
    'management'
  );

  await libs.framework.waitUntilFrameworkReady();

  if (libs.framework.licenseIsAtLeast('standard')) {
    libs.framework.registerManagementSection({
      id: 'data_collection',
      name: i18n.translate('xpack.fleet.dataCollectionManagementSectionLabel', {
        defaultMessage: 'Data Collection',
      }),
      iconName: 'logoAPM',
    });

    libs.framework.registerManagementUI({
      sectionId: 'data_collection',
      name: i18n.translate('xpack.fleet.fleetManagementLinkLabel', {
        defaultMessage: 'Fleet',
      }),
      basePath: BASE_PATH,
    });
  }
}

startApp(compose());
