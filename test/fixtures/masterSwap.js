/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



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
          createEvent(9),
          createEvent(8),
          createEvent(7),
          createEvent(6),
          createEvent(5),
          createEvent(4),
          createEvent(3),
          createEvent(2),
          createEvent(1)
        ]
      },
      '127.0.0.1:9301': {
        _type: 'date_histogram',
        entries: [
          createEvent(1, 20)
        ]
      }
    }
  };

});
