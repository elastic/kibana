import { keysToCamelCaseShallow, keysToSnakeCaseShallow } from '../../../plugins/kibana/common/lib/case_conversion';
import _ from 'lodash';
import angular from 'angular';

export default function IngestProvider($rootScope, $http, config) {

  const ingestAPIPrefix = '../api/kibana/ingest';

  this.save = function (indexPattern, pipeline) {
    if (_.isEmpty(indexPattern)) {
      throw new Error('index pattern is required');
    }

    const payload = {
      index_pattern: keysToSnakeCaseShallow(indexPattern)
    };
    if (!_.isEmpty(pipeline)) {
      payload.pipeline = pipeline;
    }

    return $http.post(`${ingestAPIPrefix}`, payload)
    .then(() => {
      if (!config.get('defaultIndex')) {
        config.set('defaultIndex', indexPattern.id);
      }

      $rootScope.$broadcast('ingest:updated');
    });
  };

  this.delete = function (ingestId) {
    if (_.isEmpty(ingestId)) {
      throw new Error('ingest id is required');
    }

    return $http.delete(`${ingestAPIPrefix}/${ingestId}`)
    .then(() => {
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

    return $http.post(`../api/kibana/ingest/simulate`, pack(pipeline))
    .then(unpack)
    .catch(err => {
      throw ('Error communicating with Kibana server');
    });
  };

}
