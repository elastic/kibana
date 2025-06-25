/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { INDEX } from '../../common/es_fields';
import { extractIndexNameFromBackingIndex } from '../../common/utils';

/**
 * Extracts the key from the bucket key based on the groupBy fields.
 * If "_index" is not part of the groupBy, bucketKey is returned.
 * Otherwise, it replaces the "_index" value in the bucketKey with the actual dataStream name.
 *
 * @param {Object} params - The parameters object.
 * @param {string[]} params.groupBy - The groupBy fields.
 * @param {string[]} params.bucketKey - The bucket key values.
 * @returns {string[]} The extracted key.
 * @example
 * // returns ['logs-dataset-namespace', 'aws']
 * extractKey({ groupBy: ['_index', 'cloud.provider'], bucketKey: ['.ds-logs-dataset-namespace-2025.04.08-000001', 'aws'] });
 */
export const extractKey = ({
  groupBy,
  bucketKey,
}: {
  groupBy: string[];
  bucketKey: FieldValue[];
}): string[] => {
  if (!groupBy.includes(INDEX)) {
    return bucketKey as string[];
  }

  const dataStreamIndex = groupBy.findIndex((group) => group === INDEX);
  const dataStreamName = extractIndexNameFromBackingIndex(bucketKey[dataStreamIndex] as string);
  const key = [
    ...bucketKey.slice(0, dataStreamIndex),
    dataStreamName,
    ...bucketKey.slice(dataStreamIndex + 1),
  ];

  return key as string[];
};
