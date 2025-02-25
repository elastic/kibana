/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

// TODO: Move to union type when another type appears
const assetSchema = t.type({ type: t.literal('dashboard'), id: t.string, name: t.string });

const assetsSchema = t.array(assetSchema);

export { assetSchema, assetsSchema };
