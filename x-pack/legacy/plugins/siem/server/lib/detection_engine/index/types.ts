/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Can we change the options?: V to be options?: U
export type CallWithRequest<T, U, V> = (endpoint: string, params: T, options?: V) => Promise<V>;
