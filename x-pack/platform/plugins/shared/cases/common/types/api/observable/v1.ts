/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
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

export type AddObservableRequest = rt.TypeOf<typeof AddObservableRequestRt>;
export type UpdateObservableRequest = rt.TypeOf<typeof UpdateObservableRequestRt>;
