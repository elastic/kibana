/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  MAX_OBSERVABLES_PER_CASE,
  MIN_BULK_DELETE_OBSERVABLE_IDS,
  OBSERVABLE_ID_MAX_LENGTH,
} from '../../../constants';
import { limitedArraySchema, limitedStringSchema } from '../../../schema';
import { CaseObservableBaseRt } from '../../domain/observable/v1';

/**
 * Observables
 */
export const ObservablePostRt = CaseObservableBaseRt;

export const ObservablePatchRt = rt.strict({
  value: rt.string,
  description: rt.union([rt.string, rt.null]),
});

export type ObservablePatch = rt.TypeOf<typeof ObservablePatchRt>;
export type ObservablePost = rt.TypeOf<typeof ObservablePostRt>;

export const AddObservableRequestRt = rt.strict({
  observable: ObservablePostRt,
});

export const UpdateObservableRequestRt = rt.strict({
  observable: ObservablePatchRt,
});

export const BulkAddObservablesRequestRt = rt.strict({
  caseId: rt.string,
  observables: rt.array(ObservablePostRt),
});

const BoundedObservableIdRt = limitedStringSchema({
  fieldName: 'observableId',
  min: 1,
  max: OBSERVABLE_ID_MAX_LENGTH,
});

export const BulkDeleteObservablesRequestRt = rt.strict({
  caseId: rt.string,
  observableIds: limitedArraySchema({
    codec: BoundedObservableIdRt,
    min: MIN_BULK_DELETE_OBSERVABLE_IDS,
    max: MAX_OBSERVABLES_PER_CASE,
    fieldName: 'observableIds',
  }),
});

export type AddObservableRequest = rt.TypeOf<typeof AddObservableRequestRt>;
export type UpdateObservableRequest = rt.TypeOf<typeof UpdateObservableRequestRt>;
export type BulkAddObservablesRequest = rt.TypeOf<typeof BulkAddObservablesRequestRt>;
export type BulkDeleteObservablesRequest = rt.TypeOf<typeof BulkDeleteObservablesRequestRt>;
