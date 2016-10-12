import { keysToCamelCaseShallow } from '../../../core_plugins/kibana/common/lib/case_conversion';
import { keysToSnakeCaseShallow } from '../../../core_plugins/kibana/common/lib/case_conversion';
import { map, isEmpty } from 'lodash';
import angular from 'angular';
import chrome from 'ui/chrome';

export default function PipelinesProvider($http, $q, Private) {

  const apiPrefix = chrome.addBasePath('/api/kibana/pipelines');

  function packProcessors(processors) {
    return map(processors, (processor) => {
      const result = keysToSnakeCaseShallow(processor);
      result.failure_processors = packProcessors(result.failure_processors);
      if (result.processors) {
        result.processors = packProcessors(result.processors); //for the foreach processor
      }

      return result;
    });
  }

  function packSamples(samples) {
    return map(samples, (sample) => {
      const result = keysToSnakeCaseShallow(sample);
      return result;
    });
  }

  function packPipeline(pipeline) {
    const result = keysToSnakeCaseShallow(pipeline);
    result.processors = packProcessors(result.processors);
    if (result.failure_processors) {
      result.failure_processors = packProcessors(result.failure_processors);
    }
    result.samples = packSamples(result.samples);

    return result;
  }

  function unpackProcessors(processors) {
    return map(processors, (processor) => {
      const result = keysToCamelCaseShallow(processor);
      result.failureProcessors = unpackProcessors(result.failureProcessors);
      if (result.processors) {
        result.processors = unpackProcessors(result.processors); //for the foreach processor
      }

      return result;
    });
  }

  function unpackSamples(samples) {
    return map(samples, (sample) => {
      const result = keysToCamelCaseShallow(sample);
      return result;
    });
  }

  function unpackPipeline(pipeline) {
    const result = keysToCamelCaseShallow(pipeline);
    result.processors = unpackProcessors(result.processors);
    if (result.failureProcessors) {
      result.failureProcessors = unpackProcessors(result.failureProcessors);
    }
    result.samples = unpackSamples(result.samples);

    return result;
  }

  this.pipeline = {
    save: (pipeline) => {
      return $http.put(`${apiPrefix}/pipeline`, packPipeline(pipeline))
      .catch(err => {
        return $q.reject(new Error('Error saving pipeline'));
      });
    },
    load: function (pipelineId) {
      function unpack(response) {
        const result = unpackPipeline(response.data);
        return result;
      }

      return $http.get(`${apiPrefix}/pipeline/${pipelineId}`)
      .then(unpack)
      .catch(err => {
        return $q.reject(new Error('Error fetching pipeline'));
      });
    },
    delete: function (pipelineId) {
      if (isEmpty(pipelineId)) {
        throw new Error('pipeline id is required');
      }

      return $http.delete(`${apiPrefix}/pipeline/${pipelineId}`);
    },
    simulate: function (pipeline) {
      function unpack(response) {
        const data = map(response.data, (sampleResponse) => {
          return map(sampleResponse, (processorResponse) => {
            return keysToCamelCaseShallow(processorResponse);
          });
        });

        return data;
      }

      const payload = packPipeline(pipeline);
      return $http.post(`${apiPrefix}/simulate`, payload)
      .then(unpack)
      .catch(err => {
        return $q.reject(new Error('Error simulating pipeline'));
      });
    }
  };

  this.pipelines = {
    load: function () {
      function unpack(response) {
        return map(response.data, (pipeline) => {
          return unpackPipeline(pipeline);
        });
      }

      return $http.get(`${apiPrefix}/pipelines`)
      .then(unpack)
      .catch(err => {
        return $q.reject(new Error('Error fetching pipelines'));
      });
    }
  };

}
