/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { EVALUATOR_UUID_NAMESPACE } from '../constants';

/**
 * The id a version of an evaluator definition takes in a space. Deriving it
 * from the three fields that identify a version is what lets a create refuse a
 * duplicate on its own: two writes of the same version compete for one id, and
 * the second is rejected rather than overwriting the first.
 */
export const getEvaluatorDefinitionId = (spaceId: string, name: string, version: string): string =>
  uuidv5(JSON.stringify([spaceId, name, version]), EVALUATOR_UUID_NAMESPACE);

/**
 * The id of the version written on top of `parentVersion`, so concurrent edits of one version
 * compete for a single id and only one of them can become its successor.
 */
export const getEvaluatorSuccessorId = (
  spaceId: string,
  name: string,
  parentVersion: string
): string =>
  uuidv5(JSON.stringify([spaceId, name, parentVersion, 'successor']), EVALUATOR_UUID_NAMESPACE);
