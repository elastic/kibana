define(function (require) {
  'use strict';
  return  function (num, maxBy, minBy) {
    var time = moment('2014-01-01T00:00:00Z').subtract('minute', num).toDate().getTime();
    return {
      time: time,
      count: 6,
      max: maxBy && time + maxBy || time,
      min: minBy && time + minBy || time 
    };
  };
});
