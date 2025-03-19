/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';

import type { Output } from '../../../common';

export const backfillOutputPolicyToV7: SavedObjectModelDataBackfillFn<
  Output & {
    topics?: Array<{
      topic: string;
      when?: {
        type?: string;
        condition?: string;
      };
    }>;
  },
  Output
> = (outputDoc) => {
  if (outputDoc.attributes.type === 'kafka' && outputDoc.attributes.topics) {
    if (!outputDoc.attributes.topic) {
      outputDoc.attributes.topic = outputDoc.attributes.topics?.filter((t) => !t.when)?.[0]?.topic;
    }

    delete outputDoc.attributes.topics;
  }
  return outputDoc;
};
