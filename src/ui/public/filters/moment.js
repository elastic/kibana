import moment from 'moment';
import _ from 'lodash';
define(function (require) {

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
});
