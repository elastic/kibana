import chrome from 'ui/chrome';
import _ from 'lodash';

export default function ($http) {

  return function (fields, indices) {
    return $http.get(chrome.addBasePath(`/api/kibana/${indices}/field_capabilities`))
    .then((res) => {
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
