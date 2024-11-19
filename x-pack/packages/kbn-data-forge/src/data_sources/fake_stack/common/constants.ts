/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { times, padStart } from 'lodash';

export const ADMIN_CONSOLE = 'admin-console';

export const ADMIN_CONSOLE_HOSTS = times(20).map(
  (n) => `${ADMIN_CONSOLE}.prod.${padStart(`${n + 1}`, 3, '0')}`
);
export const ADMIN_CONSOLE_QA_HOSTS = times(5).map(
  (n) => `${ADMIN_CONSOLE}.qa.${padStart(`${n + 1}`, 3, '0')}`
);
export const ADMIN_CONSOLE_STAGING_HOSTS = times(5).map(
  (n) => `${ADMIN_CONSOLE}.staging.${padStart(`${n + 1}`, 3, '0')}`
);

export const MONGODB = 'mongodb';

export const MONGODB_HOSTS = times(3).map((n) => `${MONGODB}.prod.${padStart(`${n + 1}`, 3, '0')}`);

export const MESSAGE_PROCESSOR = 'message_processor';

export const MESSAGE_PROCESSOR_HOSTS = times(10).map(
  (n) => `${MESSAGE_PROCESSOR}.prod.${padStart(`${n + 1}`, 3, '0')}`
);

export const DOMAINS = ['blast-mail.co', 'mail.at', 'the-post.box', 'you-got.mail'];

export const MONGO_DB_GATEWAY = 'mongodb-gateway.mail-sass.co:27017';

export const NGINX_PROXY = 'nginx_proxy';
export const NGINX_PROXY_HOSTS = times(5).map(
  (n) => `${NGINX_PROXY}.prod.${padStart(`${n + 1}`, 3, '0')}`
);

export const HEARTBEAT = 'heartbeat';
