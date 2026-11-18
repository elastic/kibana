/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { ApiBodyEntry } from '@kbn/saved-objects-management-plugin/server';
import type { LensAttributes } from '../content_management';
import { upgradeLensItemAttributes } from '../../common/content_management/upgrade';
import { lensUpdateRequestBodySchema } from './routes/visualizations/schema';
import type { LensApiConfigLibItemNoESQL } from './routes/visualizations/schema/common';
import { getLensApiData, getLensRequestConfig } from './routes/visualizations/utils';

/** Creates the `lens` entry for Saved Objects Management's API body registry. */
export const createLensApiBodyEntry = (
  builder: LensConfigBuilder
): ApiBodyEntry<LensApiConfigLibItemNoESQL, LensAttributes> => ({
  getSchema: () => lensUpdateRequestBodySchema,
  // Same as the public GET, which upgrades the item to the latest content version first.
  // ES|QL charts throw, as they do on the GET.
  toApi: ({ attributes, references }) => ({
    body: getLensApiData(builder, {
      attributes: upgradeLensItemAttributes(attributes),
      references,
    }),
    warnings: [],
  }),
  // Same as the PUT route, whose content storage upgrades the item to the latest content version.
  toStored: (body) => {
    const { references = [], ...attributes } = getLensRequestConfig(builder, body);
    return { attributes: upgradeLensItemAttributes(attributes), references };
  },
});
