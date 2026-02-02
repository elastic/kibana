/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidatorServices } from '@kbn/actions-plugin/server/types';

export interface ExternalServiceCredentials {
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

export interface ExternalServiceValidation {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: (configObject: any, validatorServices: ValidatorServices) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secrets: (secrets: any, validatorServices: ValidatorServices) => void;
}
