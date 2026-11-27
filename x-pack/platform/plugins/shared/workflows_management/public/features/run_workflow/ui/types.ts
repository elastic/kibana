/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ENABLED_STEP_TRIGGER_TABS, ENABLED_TRIGGER_TABS } from './constants';

export type WorkflowTriggerTab = (typeof ENABLED_TRIGGER_TABS)[number];
export type WorkflowStepTriggerTab = (typeof ENABLED_STEP_TRIGGER_TABS)[number];
