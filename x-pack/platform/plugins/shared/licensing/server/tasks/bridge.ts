/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { LicensingTasksSetup, LicensingTasksStart } from '.';

/** The real license stream and feature usage in Kibana; a task pod builds its own. */
export const licensingBridge = createTasksKibanaBridge<LicensingTasksSetup, LicensingTasksStart>();
