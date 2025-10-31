/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  JobValidationMessage,
  JobValidationMessageId,
} from '@kbn/ml-common-constants/messages';

export interface ValidationResults {
  valid: boolean;
  messages: JobValidationMessage[];
  contains: (id: JobValidationMessageId) => boolean;
  find: (id: JobValidationMessageId) => { id: JobValidationMessageId } | undefined;
}
