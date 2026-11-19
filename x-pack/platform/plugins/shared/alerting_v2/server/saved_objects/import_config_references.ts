/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Saved object type of a connector. Owned by the actions plugin, which this plugin does not depend
 * on, so the value is repeated here.
 */
export const CONNECTOR_SAVED_OBJECT_TYPE = 'action';

/** Name of the import config's saved object reference to its connector. */
export const IMPORT_CONFIG_CONNECTOR_REFERENCE_NAME = 'connector';
