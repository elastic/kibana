import RefreshKibanaIndexProvider from 'plugins/kibana/management/sections/indices/_refresh_kibana_index';
import { keysToCamelCaseShallow, keysToSnakeCaseShallow } from '../../../core_plugins/kibana/common/lib/case_conversion';
import _ from 'lodash';
import angular from 'angular';
import chrome from 'ui/chrome';

export default function IngestProvider($rootScope, $http, config, $q, Private, indexPatterns) {

  const ingestAPIPrefix = chrome.addBasePath('/api/kibana/ingest');
  const refreshKibanaIndex = Private(RefreshKibanaIndexProvider);

  this.save = function (indexPattern, pipeline) {
    if (_.isEmpty(indexPattern)) {
      throw new Error('index pattern is required');
    }

    const payload = {
      index_pattern: keysToSnakeCaseShallow(indexPattern)
    };
    if (!_.isEmpty(pipeline)) {
      payload.pipeline = _.map(pipeline, processor => keysToSnakeCaseShallow(processor));
    }

    return $http.post(`${ingestAPIPrefix}`, payload)
    .then(() => {
      if (!config.get('defaultIndex')) {
        config.set('defaultIndex', indexPattern.id);
      }

      indexPatterns.getIds.clearCache();
      $rootScope.$broadcast('ingest:updated');
    });
  };

  this.delete = function (ingestId) {
    if (_.isEmpty(ingestId)) {
      throw new Error('ingest id is required');
    }

    return $http.delete(`${ingestAPIPrefix}/${ingestId}`)
    .then(() => {
      indexPatterns.getIds.clearCache();
      $rootScope.$broadcast('ingest:updated');
    });
  };

  this.simulate = function (pipeline) {
    function pack(pipeline) {
      const result = keysToSnakeCaseShallow(pipeline);
      result.processors = _.map(result.processors, processor => keysToSnakeCaseShallow(processor));

      return result;
    }

    function unpack(response) {
      const data = response.data.map(result => keysToCamelCaseShallow(result));
      return data;
    }

    return $http.post(`${ingestAPIPrefix}/simulate`, pack(pipeline))
    .then(unpack)
    .catch(err => {
      return $q.reject(new Error('Error simulating pipeline'));
    });
  };

  this.getProcessors = function () {
    function unpack(response) {
      return response.data;
    }

    return $http.get(`${ingestAPIPrefix}/processors`)
    .then(unpack)
    .catch(err => {
      return $q.reject(new Error('Error fetching enabled processors'));
    });
  };

  this.uploadCSV = function (file, indexPattern, delimiter, pipeline) {
    if (_.isUndefined(file)) {
      throw new Error('file is required');
    }
    if (_.isUndefined(indexPattern)) {
      throw new Error('index pattern is required');
    }

    const formData = new FormData();
    formData.append('csv', file);

    const params = {};
    if (!_.isUndefined(delimiter)) {
      params.csv_delimiter = delimiter;
    }
    if (!_.isUndefined(pipeline)) {
      params.pipeline = pipeline;
    }

    return $http.post(chrome.addBasePath(`/api/kibana/${indexPattern}/_data`), formData, {
      params: params,
      transformRequest: angular.identity,
      headers: {'Content-Type': undefined}
    });
  };

}
