/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from './connectors';
/**
 * Guesses the model based on the connector type and configuration.
 *
 * Inferred from the type for "legacy" connectors,
 * and from the provider config field for inference connectors.
 */
export declare const getConnectorModel: (connector: InferenceConnector) => string | undefined;
