define(function (require) {
  let module = require('ui/modules').get('kibana');

  module.constant('timeUnits', {
    s: 'second',
    m: 'minute',
    h: 'hour',
    d: 'day',
    w: 'week',
    M: 'month',
    y: 'year'
  });

});
