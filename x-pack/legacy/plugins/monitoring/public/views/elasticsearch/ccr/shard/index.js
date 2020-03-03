/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import uiRoutes from 'plugins/monitoring/np_imports/ui/routes';
import { getPageData } from './get_page_data';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { MonitoringViewBaseController } from '../../../base_controller';
import { CcrShard } from '../../../../components/elasticsearch/ccr_shard';
import { I18nContext } from 'ui/i18n';
import { CODE_PATH_ELASTICSEARCH } from '../../../../../common/constants';

uiRoutes.when('/elasticsearch/ccr/:index/shard/:shardId', {
  template,
  resolve: {
    clusters: function(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_ELASTICSEARCH] });
    },
    pageData: getPageData,
  },
  controllerAs: 'elasticsearchCcr',
  controller: class ElasticsearchCcrController extends MonitoringViewBaseController {
    constructor($injector, $scope, pageData) {
      super({
        title: i18n.translate('xpack.monitoring.elasticsearch.ccr.shard.routeTitle', {
          defaultMessage: 'Elasticsearch - Ccr - Shard',
        }),
        reactNodeId: 'elasticsearchCcrShardReact',
        getPageData,
        $scope,
        $injector,
      });

      $scope.instance = i18n.translate('xpack.monitoring.elasticsearch.ccr.shard.instanceTitle', {
        defaultMessage: 'Index: {followerIndex} Shard: {shardId}',
        values: {
          followerIndex: get(pageData, 'stat.follower_index'),
          shardId: get(pageData, 'stat.shard_id'),
        },
      });

      $scope.$watch(
        () => this.data,
        data => {
          this.renderReact(data);
        }
      );

      this.renderReact = props => {
        super.renderReact(
          <I18nContext>
            <CcrShard {...props} />
          </I18nContext>
        );
      };
    }
  },
});
