/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector, RawConnector } from './connectors';
/**
 * Converts an action connector to the internal inference connector format.
 *
 * The function will throw if the provided connector is not compatible
 */
export declare const connectorToInference: (connector: RawConnector) => InferenceConnector;
