/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uiRoutes from 'plugins/monitoring/np_imports/ui/routes';

uiRoutes.when('/_cluster/:clusterUuid/:route*', {
  template: '',
  controller: class {
    constructor($injector, $scope) {
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');
      const kbnUrl = $injector.get('kbnUrl');

      $scope.$evalAsync(() => {
        const route = $route.current.params.route;
        let ccs = null;
        let clusterUuid = $route.current.params.clusterUuid;
        if (clusterUuid.includes(':')) {
          const parts = clusterUuid.split(':');
          clusterUuid = parts[1];
          ccs = parts[0];
        }

        globalState.cluster_uuid = clusterUuid;
        globalState.ccs = ccs;
        globalState.save();
        kbnUrl.changePath(route);
      });
    }
  },
});
