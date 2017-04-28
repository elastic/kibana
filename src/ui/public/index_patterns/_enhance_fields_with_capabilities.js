import chrome from 'ui/chrome';
import _ from 'lodash';
import Notifier from 'ui/notify/notifier';
import { ShardFailure } from 'ui/errors';

export default function ($http) {
  const notifier = new Notifier({
    location: 'Field Capabilities'
  });

  return function (fields, indices) {
    return $http.get(chrome.addBasePath(`/api/kibana/${indices}/field_capabilities`))
    .then((res) => {
      if (_.get(res, 'data.shard_failure_response')) {
        notifier.warning(new ShardFailure(res.data.shard_failure_response));
      }

      const stats = _.get(res, 'data.fields', {});

      return _.map(fields, (field) => {
        if (field.type === 'geo_point' && !stats[field.name]) {
          // FIXME: remove once https://github.com/elastic/elasticsearch/issues/20707 is fixed
          return _.assign(field, {
            'searchable': true,
            'aggregatable': true
          });
        }

        return _.assign(field, stats[field.name]);
      });
    });
  };
}
