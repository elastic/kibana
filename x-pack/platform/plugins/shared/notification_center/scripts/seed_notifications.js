/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');
// Explicit subpath: `./seed_notifications` would resolve back to this file.
require('./seed_notifications/cli');

/*
Usage:

node x-pack/platform/plugins/shared/notification_center/scripts/seed_notifications.js --help

*/
