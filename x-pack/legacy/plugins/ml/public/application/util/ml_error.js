/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KbnError } from '../../../../../../../src/plugins/kibana_utils/public';

export class MLRequestFailure extends KbnError {
  // takes an Error object and and optional response object
  // if error is falsy (null) the response object will be used
  // notify will show the full expandable stack trace of the response if a response object is used and no error is passed in.
  constructor(error, resp) {
    error = error || {};
    super(error.message || JSON.stringify(resp), MLRequestFailure);

    this.origError = error;
    this.resp = (typeof resp === 'string') ? JSON.parse(resp) : resp;
  }
}
