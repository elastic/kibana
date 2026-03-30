/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Structurally required placeholder set in buildActionParams for attack discovery rule runs.
 * getValidatedRunParams immediately replaces this with the live setting value
 * (bounded by MAX_OPEN_CASES) when internallyManagedAlerts is true, so this value
 * never affects execution.
 */
export const ATTACK_DISCOVERY_MAX_OPEN_CASES = 20;
