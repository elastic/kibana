/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';

export const productDocInstallStatusSavedObjectTypeName = 'product-doc-install-status';

/**
 * The id of the inference endpoint we're creating for our product doc indices.
 */
export const internalElserInferenceId = defaultInferenceEndpoints.ELSER;
