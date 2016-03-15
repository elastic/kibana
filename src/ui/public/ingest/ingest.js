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

  function packageSimulatePipeline(pipeline) {
    const requiredFields = ['input', 'processors'];
    const cleanedPipeline = _.pick(pipeline, requiredFields);
    return keysToSnakeCaseShallow(cleanedPipeline);
  }

  function packageSimulateProcessor(processor) {
    return keysToSnakeCaseShallow(processor.data);
  }

  function packageSimulateRequest(pipeline) {
    const apiPipeline = packageSimulatePipeline(pipeline);
    apiPipeline.processors = apiPipeline.processors.map(packageSimulateProcessor);
    return angular.toJson(apiPipeline);
  }

  function unpackageSimulateResult(result) {
    const data = result.data.map((processorResult) => keysToCamelCaseShallow(processorResult));
    return data;
  }

  this.simulate = function (pipeline) {
    const data = packageSimulateRequest(pipeline);

    return $http.post(`../api/kibana/ingest/simulate`, data)
    .then(unpackageSimulateResult)
    .catch((err) => {
      throw ('Error communicating with Kibana server');
    });
  };

}
