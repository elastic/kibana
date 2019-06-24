/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export {
  notificationService,
  Action,
  ActionResult,
} from './service';
export { createEmailAction } from './email';
export { createSlackAction } from './slack';
export { LoggerAction } from './logger';
