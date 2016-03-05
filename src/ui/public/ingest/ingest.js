import { keysToSnakeCaseShallow } from '../../../plugins/kibana/common/lib/case_conversion';

export default function IngestProvider($rootScope, $http, config) {

  this.save = function (indexPattern, pipeline) {
    return $http.post('../api/kibana/ingest', {
      index_pattern: keysToSnakeCaseShallow(indexPattern),
      pipeline: pipeline
    })
    .then(() => {
      if (!config.get('defaultIndex')) {
        config.set('defaultIndex', indexPattern.id);
      }

      $rootScope.$broadcast('ingest:updated');
    });
  };

}
