/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnitDestination } from './destination_models';
import { DESTINATION_SIGNALS } from './destination_models';

export const s3CredentialNames = (
  id: string
): { accessKeyId: string; secretAccessKey: string } => ({
  accessKeyId: `${id}-access-key-id`,
  secretAccessKey: `${id}-secret-access-key`,
});

/** Builds an S3 node whose keys are `{ credential }` references, the values travel as unit secrets. */
export const createS3UnitDestination = ({
  id,
  name,
  region,
  bucket,
  prefix,
}: {
  id: string;
  name: string;
  region: string;
  bucket: string;
  prefix: string;
}): UnitDestination => {
  const { accessKeyId, secretAccessKey } = s3CredentialNames(id);
  return {
    id,
    name,
    type: 's3',
    supported_telemetry: [...DESTINATION_SIGNALS],
    config: [
      { name: 'bucket', value: bucket },
      { name: 'region', value: region },
      ...(prefix ? [{ name: 'prefix', value: prefix }] : []),
      { name: 'access_key_id', value: { credential: accessKeyId } },
      { name: 'secret_access_key', value: { credential: secretAccessKey } },
    ],
  };
};
