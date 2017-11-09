import moment from 'ui/moment';
import _ from 'ui/lodash';
import { uiModules } from 'ui/modules';

uiModules
  .get('kibana')
  .filter('moment', function (config) {
    return function (datetime) {
      const format = config.get('dateFormat');
      if (moment.isMoment(datetime)) return datetime.format(format);
      if (_.isDate(datetime)) return moment(datetime).format(format);
      return datetime;
    };
  });
