/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env');
require('./kit.node_test');
require('./es_parity.node_test');
require('./concurrency.node_test');
require('./batch_stream.node_test');
require('./errors.node_test');
require('./async_handles.node_test');
require('./sync.node_test');
