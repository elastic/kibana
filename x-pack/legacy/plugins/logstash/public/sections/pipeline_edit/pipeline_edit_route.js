/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routes from 'ui/routes';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import template from './pipeline_edit_route.html';
import 'plugins/logstash/services/pipeline';
import 'plugins/logstash/services/license';
import 'plugins/logstash/services/upgrade';
import './components/pipeline_edit';
import './components/upgrade_failure';
import { updateLogstashSections } from 'plugins/logstash/lib/update_management_sections';
import { Pipeline } from 'plugins/logstash/models/pipeline';
import { getPipelineCreateBreadcrumbs, getPipelineEditBreadcrumbs } from '../breadcrumbs';

routes
  .when('/management/logstash/pipelines/pipeline/:id/edit', {
    k7Breadcrumbs: getPipelineEditBreadcrumbs,
  })
  .when('/management/logstash/pipelines/new-pipeline', {
    k7Breadcrumbs: getPipelineCreateBreadcrumbs,
  })
  .defaults(/management\/logstash\/pipelines\/(new-pipeline|pipeline\/:id\/edit)/, {
    template: template,
    controller: class PipelineEditRouteController {
      constructor($injector) {
        const $route = $injector.get('$route');
        this.pipeline = $route.current.locals.pipeline;
        this.isUpgraded = $route.current.locals.isUpgraded;
      }
    },
    controllerAs: 'pipelineEditRoute',
    resolve: {
      logstashTabs: $injector => {
        const $route = $injector.get('$route');
        const pipelineId = $route.current.params.id;
        updateLogstashSections(pipelineId);
      },
      pipeline: function($injector) {
        const $route = $injector.get('$route');
        const pipelineService = $injector.get('pipelineService');
        const licenseService = $injector.get('logstashLicenseService');
        const kbnUrl = $injector.get('kbnUrl');

        const pipelineId = $route.current.params.id;

        if (!pipelineId) return new Pipeline();

        return pipelineService
          .loadPipeline(pipelineId)
          .then(pipeline => (!!$route.current.params.clone ? pipeline.clone : pipeline))
          .catch(err => {
            return licenseService.checkValidity().then(() => {
              if (err.status !== 403) {
                toastNotifications.addDanger(
                  i18n.translate('xpack.logstash.couldNotLoadPipelineErrorNotification', {
                    defaultMessage: `Couldn't load pipeline. Error: '{errStatusText}'.`,
                    values: {
                      errStatusText: err.statusText,
                    },
                  })
                );
              }

              kbnUrl.redirect('/management/logstash/pipelines');
              return Promise.reject();
            });
          });
      },
      checkLicense: $injector => {
        const licenseService = $injector.get('logstashLicenseService');
        return licenseService.checkValidity();
      },
      isUpgraded: $injector => {
        const upgradeService = $injector.get('upgradeService');
        return upgradeService.executeUpgrade();
      },
    },
  });

routes.when('/management/logstash/pipelines/pipeline/:id', {
  redirectTo: '/management/logstash/pipelines/pipeline/:id/edit',
});
