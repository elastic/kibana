/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableTransforms } from '@kbn/embeddable-plugin/common';
import type { Required } from 'utility-types';

import type {
  LensSerializedState,
  LensByRefSerializedState,
  LensByValueSerializedState,
} from '@kbn/lens-common';

export type LensTransforms = Required<
  EmbeddableTransforms<LensSerializedState, LensSerializedState>,
  'transformIn' | 'transformOut'
>;

/**
 * Transform from Lens API format to Lens Serialized State
 */
export type LensTransformIn = LensTransforms['transformIn'];

/**
 * Transform from to Lens Serialized State to Lens API format
 */
export type LensTransformOut = LensTransforms['transformOut'];

type LensByRefTransforms = Required<
  EmbeddableTransforms<LensByRefSerializedState, LensByRefSerializedState>
>;
export type LensByRefTransformInResult = ReturnType<LensByRefTransforms['transformIn']>;
export type LensByRefTransformOutResult = ReturnType<LensByRefTransforms['transformOut']>;

type LensByValueTransforms = Required<
  EmbeddableTransforms<LensByValueSerializedState, LensByValueSerializedState>
>;
export type LensByValueTransformInResult = ReturnType<LensByValueTransforms['transformIn']>;
export type LensByValueTransformOutResult = ReturnType<LensByValueTransforms['transformOut']>;
