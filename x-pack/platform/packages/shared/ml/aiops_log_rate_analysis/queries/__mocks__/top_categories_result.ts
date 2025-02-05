/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const topCategoriesResultMock = [
  {
    bg_count: 0,
    doc_count: 1642,
    fieldName: 'message',
    fieldValue:
      '71.231.222.196 - - [2018-08-13T05:04:08.731Z] "GET /kibana/kibana-6.3.2-windows-x86_64.zip HTTP/1.1" 200 15139 "-" "Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1"',
    key: 'GET HTTP/1.1 Mozilla/5.0 X11 Linux x86_64 rv Gecko/20110421 Firefox/6.0a1',
    normalizedScore: 0,
    pValue: 1,
    score: 0,
    total_bg_count: 0,
    total_doc_count: 0,
    type: 'log_pattern',
  },
  {
    bg_count: 0,
    doc_count: 1488,
    fieldName: 'message',
    fieldValue:
      '7.210.210.41 - - [2018-08-13T04:20:49.558Z] "GET /elasticsearch/elasticsearch-6.3.2.deb HTTP/1.1" 404 6699 "-" "Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24"',
    key: 'GET HTTP/1.1 Mozilla/5.0 X11 Linux i686 AppleWebKit/534.24 KHTML like Gecko Chrome/11.0.696.50 Safari/534.24',
    normalizedScore: 0,
    pValue: 1,
    score: 0,
    total_bg_count: 0,
    total_doc_count: 0,
    type: 'log_pattern',
  },
];
