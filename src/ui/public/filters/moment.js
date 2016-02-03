import moment from 'moment';
import _ from 'lodash';

require('ui/modules')
  .get('kibana')
  .filter('moment', function (config) {
    return function (datetime) {
      var format = config.get('dateFormat');
      if (moment.isMoment(datetime)) return datetime.format(format);
      if (_.isDate(datetime)) return moment(datetime).format(format);
      return datetime;
    };
  });
