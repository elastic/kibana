/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import ReactDOM from 'react-dom';
import { I18nContext } from 'ui/i18n';
import { npSetup } from 'ui/new_platform';
import { getLinkState } from '../../lib/license_check';
import { LicensingPluginSetup } from '../../../../../../plugins/licensing/public';
import { ReportListing } from '../../components/report_listing';

const management = npSetup.plugins.management;
// @ts-ignore TS doesn't have types for this due to breaking OS builds
const licensing = npSetup.plugins.licensing as LicensingPluginSetup;

const title = i18n.translate('xpack.reporting.management.reportingTitle', {
  defaultMessage: 'Reporting',
});

const breadcrumbText = i18n.translate('xpack.reporting.breadcrumb', {
  defaultMessage: 'Reporting',
});

licensing.license$.subscribe(license => {
  const { state, message } = license.check('reporting', 'gold');
  const { showLinks, enableLinks } = getLinkState(state);

  if (showLinks) {
    const kibanaSection = management.sections.getSection('kibana');
    kibanaSection!.registerApp({
      id: 'reporting',
      title,
      order: 15,
      mount(params) {
        params.setBreadcrumbs([{ text: breadcrumbText }]);
        ReactDOM.render(
          <I18nContext>
            <ReportListing
              badLicenseMessage={message || ''}
              showLinks={showLinks}
              enableLinks={enableLinks}
            />
          </I18nContext>,
          params.element
        );

        return () => {
          ReactDOM.unmountComponentAtNode(params.element);
        };
      },
    });
  }
});
