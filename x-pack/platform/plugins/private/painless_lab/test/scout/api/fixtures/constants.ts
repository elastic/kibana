/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TEST_INPUT = {
  script:
    '"{\\n  \\"script\\": {\\n    \\"source\\": \\"return true;\\",\\n    \\"params\\": {\\n  \\"string_parameter\\": \\"string value\\",\\n  \\"number_parameter\\": 1.5,\\n  \\"boolean_parameter\\": true\\n}\\n  }\\n}"',
  invalid_script:
    '"{\\n  \\"script\\": {\\n    \\"source\\": \\"foobar\\",\\n    \\"params\\": {\\n  \\"string_parameter\\": \\"string value\\",\\n  \\"number_parameter\\": 1.5,\\n  \\"boolean_parameter\\": true\\n}\\n  }\\n}"',
};

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};
