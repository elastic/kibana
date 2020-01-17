/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routes from 'ui/routes';
import { management } from 'ui/management';
import template from './pipeline_list_route.html';
import './components/pipeline_list';
import 'plugins/logstash/services/license';
import { getPipelineListBreadcrumbs } from '../breadcrumbs';

routes.when('/management/logstash/pipelines/', {
  template,
  k7Breadcrumbs: getPipelineListBreadcrumbs,
});

routes.defaults(/\/management/, {
  resolve: {
    logstashManagementSection: $injector => {
      const licenseService = $injector.get('logstashLicenseService');
      const logstashSection = management.getSection('logstash/pipelines');

      if (licenseService.enableLinks) {
        logstashSection.show();
        logstashSection.enable();
      } else {
        logstashSection.hide();
      }
    },
  },
});
