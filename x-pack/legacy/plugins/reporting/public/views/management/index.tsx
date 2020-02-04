/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import React from 'react';
import ReactDOM from 'react-dom';
import { I18nContext } from 'ui/i18n';
import { npSetup } from 'ui/new_platform';
import { ReportListing } from '../../components/report_listing';

const management = npSetup.plugins.management;
const title = i18n.translate('xpack.reporting.management.reportingTitle', {
  defaultMessage: 'Reporting',
});

// TODO: Get these dang license checks in pronto-tonto
const testSection = management.sections.getSection('kibana');

testSection!.registerApp({
  id: 'test-management',
  title,
  order: 15,
  mount(params) {
    params.setBreadcrumbs([{ text: 'Boot licker' }]);
    ReactDOM.render(
      <I18nContext>
        <ReportListing
          badLicenseMessage={xpackInfo.get('features.reporting.management.message')}
          showLinks={xpackInfo.get('features.reporting.management.showLinks')}
          enableLinks={xpackInfo.get('features.reporting.management.enableLinks')}
        />
      </I18nContext>,
      params.element
    );

    return () => {
      ReactDOM.unmountComponentAtNode(params.element);
    };
  },
});
