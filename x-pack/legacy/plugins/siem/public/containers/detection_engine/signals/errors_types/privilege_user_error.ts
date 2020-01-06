/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MessageBody } from '../../../../components/ml/api/throw_if_not_ok';

export class PrivilegeUserError extends Error {
  message: string = '';
  statusCode: number = -1;
  error: string = '';

  constructor(errObj: MessageBody) {
    super(errObj.message);
    this.message = errObj.message ?? '';
    this.statusCode = errObj.statusCode ?? -1;
    this.error = errObj.error ?? '';
    this.name = 'PrivilegeUserError';

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, PrivilegeUserError.prototype);
  }
}
