/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Zod twins of the io-ts base schemas, using their final (io-ts) names.
 * While both codec libraries coexist, the package barrel re-exports these
 * with a temporary `…Zod` suffix; in-package consumers import them by
 * relative path with the final names.
 */

export * from './common';
export * from './duration';
export * from './guards';
export * from './indicators';
export * from './settings';
export * from './slo';
export * from './time_window';
