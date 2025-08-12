/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { assetSchema, assetsSchema } from '../schema';

type Assets = t.OutputOf<typeof assetsSchema>;
type Asset = t.OutputOf<typeof assetSchema>;

export type { Asset, Assets };
