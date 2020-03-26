/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { isEmpty } from 'lodash';
import { uiModules } from 'ui/modules';
import { npSetup } from 'ui/new_platform';
import { toastNotifications } from 'ui/notify';
import { I18nContext } from 'ui/i18n';
import { PipelineEditor } from '../../../../components/pipeline_editor';
import 'plugins/logstash/services/license';
import { logstashSecurity } from 'plugins/logstash/services/security';
import 'ace';

const app = uiModules.get('xpack/logstash');

app.directive('pipelineEdit', function($injector) {
  const pipelineService = $injector.get('pipelineService');
  const licenseService = $injector.get('logstashLicenseService');
  const kbnUrl = $injector.get('kbnUrl');
  const $route = $injector.get('$route');

  return {
    restrict: 'E',
    link: async (scope, el) => {
      const close = () => scope.$evalAsync(kbnUrl.change('/management/logstash/pipelines', {}));
      const open = id =>
        scope.$evalAsync(kbnUrl.change(`/management/logstash/pipelines/${id}/edit`));

      const userResource = logstashSecurity.isSecurityEnabled()
        ? await npSetup.plugins.security.authc.getCurrentUser()
        : null;

      render(
        <I18nContext>
          <PipelineEditor
            kbnUrl={kbnUrl}
            close={close}
            open={open}
            isNewPipeline={isEmpty(scope.pipeline.id)}
            username={userResource ? userResource.username : null}
            pipeline={scope.pipeline}
            pipelineService={pipelineService}
            routeService={$route}
            toastNotifications={toastNotifications}
            licenseService={licenseService}
          />
        </I18nContext>,
        el[0]
      );
    },
    scope: {
      pipeline: '=',
    },
  };
});
