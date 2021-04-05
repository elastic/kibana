/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// This type needs to still exist due to apollo-link-http-common hasn't yet updated
// it's usage (https://github.com/apollographql/apollo-link/issues/1131)
declare type GlobalFetch = WindowOrWorkerGlobalScope;
