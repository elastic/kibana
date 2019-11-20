/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { RequestHandlerContext } from 'kibana/server';

export type UMLicenseCheck = (context: RequestHandlerContext) => boolean;

export const authDomain: UMLicenseCheck = ({ licensing: { license } }) => {
  if (license === null) {
    throw Boom.badRequest('Missing license information');
  }
  if (!license.isOneOf(['basic', 'standard', 'gold', 'platinum', 'trial'])) {
    throw Boom.forbidden('License not supported');
  }
  if (license.isActive === false) {
    throw Boom.forbidden('License not active');
  }
  return true;
};
