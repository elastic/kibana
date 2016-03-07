import { keysToSnakeCaseShallow } from '../../../plugins/kibana/common/lib/case_conversion';
import _ from 'lodash';

export default function IngestProvider($rootScope, $http, config) {

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

    return $http.post('../api/kibana/ingest', payload)
    .then(() => {
      if (!config.get('defaultIndex')) {
        config.set('defaultIndex', indexPattern.id);
      }

      $rootScope.$broadcast('ingest:updated');
    });
  };

}
