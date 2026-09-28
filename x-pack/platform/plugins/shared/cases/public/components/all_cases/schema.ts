/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft } from 'fp-ts/Either';
import * as rt from 'io-ts';
import { CaseSeverityRt, CaseStatusRt } from '../../../common/types/domain';
import {
  MAX_EXTENDED_FIELD_FILTER_VALUE_LENGTH,
  MAX_EXTENDED_FIELD_FILTERS,
  MAX_TEMPLATE_DEFINITION_LENGTH,
} from '../../../common/constants';
import { limitedArraySchema, limitedStringSchema } from '../../../common/schema';

export const AllCasesURLQueryParamsRt = rt.exact(
  rt.partial({
    search: rt.string,
    severity: rt.array(CaseSeverityRt),
    status: rt.array(CaseStatusRt),
    tags: rt.array(rt.string),
    category: rt.array(rt.string),
    assignees: rt.array(rt.union([rt.string, rt.null])),
    customFields: rt.record(rt.string, rt.array(rt.string)),
    extendedFieldFilters: limitedArraySchema({
      codec: rt.exact(
        rt.type({
          label: limitedStringSchema({
            fieldName: 'extendedFieldFilters.label',
            min: 1,
            max: MAX_TEMPLATE_DEFINITION_LENGTH,
          }),
          value: limitedStringSchema({
            fieldName: 'extendedFieldFilters.value',
            min: 1,
            max: MAX_EXTENDED_FIELD_FILTER_VALUE_LENGTH,
          }),
        })
      ),
      fieldName: 'extendedFieldFilters',
      min: 0,
      max: MAX_EXTENDED_FIELD_FILTERS,
    }),
    from: rt.string,
    to: rt.string,
    sortOrder: rt.union([rt.literal('asc'), rt.literal('desc')]),
    sortField: rt.union([
      rt.literal('closedAt'),
      rt.literal('createdAt'),
      rt.literal('updatedAt'),
      rt.literal('severity'),
      rt.literal('status'),
      rt.literal('title'),
      rt.literal('category'),
    ]),
    page: rt.number,
    perPage: rt.number,
  })
);

export const validateSchema = <T extends rt.Mixed>(
  obj: unknown,
  schema: T
): rt.TypeOf<T> | null => {
  const decoded = schema.decode(obj);
  if (isLeft(decoded)) {
    return null;
  } else {
    return decoded.right;
  }
};
