define(function (require) {
  'use strict';
  var moment = require('moment');
  var createEvent = require('./createSplitBrainEvent.js');

  return {
    facets: {
      "127.0.0.1:9300": {
        _type: 'date_histogram',
        entries: [
          createEvent(10),
          createEvent(8),
          createEvent(5),
          createEvent(4),
          createEvent(3)
        ]
      },
      '127.0.0.1:9301': {
        _type: 'date_histogram',
        entries: [
          createEvent(4),
          createEvent(3),
          createEvent(2),
          createEvent(1, 20)
        ]
      }
    }
  };

});

