/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

export const QUEUE_CHUNKING_SIZE = 50;

export interface KeywordFieldCandidates {
  keywordFieldCandidates: string[];
}
export const isKeywordFieldCandidates = (d: unknown): d is KeywordFieldCandidates =>
  isPopulatedObject(d, ['keywordFieldCandidates']);

export interface TextFieldCandidates {
  textFieldCandidates: string[];
}
export const isTextFieldCandidates = (d: unknown): d is KeywordFieldCandidates =>
  isPopulatedObject(d, ['textFieldCandidates']);

export type QueueFieldCandidate = KeywordFieldCandidates | TextFieldCandidates;
