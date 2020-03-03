/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { uiModules } from 'ui/modules';
import { toastNotifications } from 'ui/notify';
import { I18nContext } from 'ui/i18n';
import { PipelineList } from '../../../../components/pipeline_list';
import 'plugins/logstash/services/pipelines';
import 'plugins/logstash/services/license';
import 'plugins/logstash/services/cluster';
import 'plugins/logstash/services/monitoring';

const app = uiModules.get('xpack/logstash');

app.directive('pipelineList', function($injector) {
  const pipelinesService = $injector.get('pipelinesService');
  const licenseService = $injector.get('logstashLicenseService');
  const clusterService = $injector.get('xpackLogstashClusterService');
  const monitoringService = $injector.get('xpackLogstashMonitoringService');
  const kbnUrl = $injector.get('kbnUrl');

  return {
    restrict: 'E',
    link: (scope, el) => {
      const openPipeline = id =>
        scope.$evalAsync(kbnUrl.change(`management/logstash/pipelines/pipeline/${id}/edit`));
      const createPipeline = () =>
        scope.$evalAsync(kbnUrl.change('management/logstash/pipelines/new-pipeline'));
      const clonePipeline = id =>
        scope.$evalAsync(kbnUrl.change(`management/logstash/pipelines/pipeline/${id}/edit?clone`));
      render(
        <I18nContext>
          <PipelineList
            clonePipeline={clonePipeline}
            clusterService={clusterService}
            isReadOnly={licenseService.isReadOnly}
            isForbidden={true}
            isLoading={false}
            licenseService={licenseService}
            monitoringService={monitoringService}
            openPipeline={openPipeline}
            createPipeline={createPipeline}
            pipelinesService={pipelinesService}
            toastNotifications={toastNotifications}
          />
        </I18nContext>,
        el[0]
      );
    },
    scope: {},
    controllerAs: 'pipelineList',
  };
});
