import chrome from 'ui/chrome';
import _ from 'lodash';

export default function ($http) {

  return function (fields, indices) {
    return $http.get(chrome.addBasePath(`/api/kibana/${indices}/field_capabilities`))
    .then((res) => {
      const stats = _.get(res, 'data.fields', {});

      return _.map(fields, (field) => {
        return _.assign(field, stats[field.name]);
      });
    });
  };
}
