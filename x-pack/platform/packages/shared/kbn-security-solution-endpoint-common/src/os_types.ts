/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The list of OS types that support. Value usually found in ECS `host.os.type` */
export const SUPPORTED_HOST_OS_TYPE = Object.freeze(['macos', 'windows', 'linux'] as const);
export type SupportedHostOsType = (typeof SUPPORTED_HOST_OS_TYPE)[number];
