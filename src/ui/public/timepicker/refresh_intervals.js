define(function (require) {
  let module = require('ui/modules').get('kibana');

  module.constant('refreshIntervals', [
    { value : 0, display: 'Off', section: 0},

   // { value : 5000, display: '5 seconds', section: 1},
    { value : 10000, display: '10秒钟', section: 1},
    { value : 30000, display: '30秒钟', section: 1},
    { value : 45000, display: '45秒钟', section: 1},

    { value : 60000, display: '1分钟', section: 2},
    { value : 300000, display: '5分钟', section: 2},
    { value : 900000, display: '15分钟', section: 2},
    { value : 1800000, display: '30分钟', section: 2},

    { value : 3600000, display: '1小时', section: 3},
    { value : 7200000, display: '2小时', section: 3},
    { value : 43200000, display: '12小时', section: 3},
    { value : 86400000, display: '1天', section: 3}
  ]);

});
