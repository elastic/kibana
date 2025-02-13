/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';

import type { SavedObjectModelVersionForwardCompatibilityFn } from '@kbn/core-saved-objects-server';

import { omit } from 'lodash';

import type { Output } from '../../../common';

export const migrateOutputToV8100: SavedObjectModelDataBackfillFn<Output, Output> = (outputDoc) => {
  const updatedOutputDoc: SavedObjectUnsanitizedDoc<Output> = outputDoc;

  if (updatedOutputDoc.attributes.type === 'kafka') {
    updatedOutputDoc.attributes.connection_type = 'plaintext';
  }

  return {
    attributes: updatedOutputDoc.attributes,
  };
};

export const migrateOutputEvictionsFromV8100: SavedObjectModelVersionForwardCompatibilityFn = (
  unknownAttributes
) => {
  const attributes = unknownAttributes as Output;
  if (attributes.type !== 'kafka') {
    return attributes;
  }

  let updatedAttributes = attributes;

  updatedAttributes = omit(updatedAttributes, ['connection_type']);

  return updatedAttributes;
};
