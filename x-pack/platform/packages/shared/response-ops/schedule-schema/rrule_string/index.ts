/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { rruleStringSchema } from './schemas/latest';
export { transformRruleStringToRrule, parseRruleString } from './transforms/string_to_rrule/latest';
export { transformRruleToRruleString } from './transforms/rrule_to_string/latest';
export type { ParseRruleStringResult } from './transforms/string_to_rrule/latest';

export { rruleStringSchema as rruleStringSchemaV1 } from './schemas/v1';
export {
  transformRruleStringToRrule as transformRruleStringToRruleV1,
  parseRruleString as parseRruleStringV1,
} from './transforms/string_to_rrule/v1';
export { transformRruleToRruleString as transformRruleToRruleStringV1 } from './transforms/rrule_to_string/v1';

export { RRULE_STRING_MAX_LENGTH, RRULE_STRING_DESCRIPTION } from './constants';
