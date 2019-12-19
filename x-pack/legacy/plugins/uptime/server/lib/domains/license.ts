/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILicense } from '../../../../../../plugins/licensing/server';

export interface UMLicenseStatusResponse {
  statusCode: number;
  message?: string;
}
export type UMLicenseCheck = (
  license: Pick<ILicense, 'isActive' | 'hasAtLeast'> | null
) => UMLicenseStatusResponse;

export const licenseCheck: UMLicenseCheck = license => {
  if (license === null) {
    return {
      message: 'Missing license information',
      statusCode: 400,
    };
  }
  if (!license.hasAtLeast('basic')) {
    return {
      message: 'License not supported',
      statusCode: 401,
    };
  }
  if (license.isActive === false) {
    return {
      message: 'License not active',
      statusCode: 403,
    };
  }
  return {
    statusCode: 200,
  };
};
