/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ContentManagementCrudTypes,
  SavedObjectCreateOptions,
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';
import type { MapContentType } from '../types';
import type { MapAttributes } from '../../../server';

export type MapCrudTypes = ContentManagementCrudTypes<
  MapContentType,
  MapAttributes,
  Pick<SavedObjectCreateOptions, 'references'>,
  Pick<SavedObjectUpdateOptions, 'references'>,
  {
    /** Flag to indicate to only search the text on the "title" field */
    onlyTitle?: boolean;
  }
>;
