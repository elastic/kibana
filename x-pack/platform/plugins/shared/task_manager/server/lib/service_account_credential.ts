/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'crypto';
import { schema } from '@kbn/config-schema';
import {
  SERVICE_ACCOUNT_WORKLOAD_ID_MAX_LENGTH,
  SERVICE_ACCOUNT_WORKLOAD_TYPE_MAX_LENGTH,
  SERVICE_ACCOUNT_WORKLOAD_TYPE_REGEX,
} from '@kbn/core-security-server';
import type { TaskCredential, TaskRunAs } from '../task';

export const SERVICE_ACCOUNT_CREDENTIAL_TYPE = 'service_account';

const ENCRYPTED_CREDENTIAL_BYTES = 32;

// `unknowns: 'ignore'` so a whole binding passed as `runAs` doesn't persist its other fields.
const runAsSchema = schema.object(
  {
    workloadType: schema.string({
      maxLength: SERVICE_ACCOUNT_WORKLOAD_TYPE_MAX_LENGTH,
      validate(workloadType) {
        if (!SERVICE_ACCOUNT_WORKLOAD_TYPE_REGEX.test(workloadType)) {
          return `must match ${SERVICE_ACCOUNT_WORKLOAD_TYPE_REGEX}`;
        }
      },
    }),
    workloadId: schema.string({ minLength: 1, maxLength: SERVICE_ACCOUNT_WORKLOAD_ID_MAX_LENGTH }),
    // `spaceId` and `expectedServiceAccountId` are keyword mappings with `ignore_above: 1024`.
    spaceId: schema.string({ minLength: 1, maxLength: 1024 }),
    // Required but nullable: `schema.nullable` would turn a missing pin into `null`.
    expectedServiceAccountId: schema.oneOf([
      schema.string({ minLength: 1, maxLength: 1024 }),
      schema.literal(null),
    ]),
  },
  { unknowns: 'ignore' }
);

/**
 * Validates `runAs` and returns the attributes that store it on a new task.
 */
export const getServiceAccountCredentialAttributes = (
  runAs: TaskRunAs
): { credential: TaskCredential; encryptedCredential: string } => {
  const { workloadType, workloadId, spaceId, expectedServiceAccountId } = runAsSchema.validate(
    runAs,
    {},
    'runAs'
  );
  return {
    credential: {
      type: SERVICE_ACCOUNT_CREDENTIAL_TYPE,
      workloadType,
      workloadId,
      spaceId,
      expectedServiceAccountId,
    },
    encryptedCredential: randomBytes(ENCRYPTED_CREDENTIAL_BYTES).toString('base64'),
  };
};

/**
 * Returns the workload a stored credential runs as, or `undefined` if it isn't a complete
 * service account credential.
 */
export const getCredentialRunAs = (credential: TaskCredential): TaskRunAs | undefined => {
  const { type, workloadType, workloadId, spaceId, expectedServiceAccountId = null } = credential;
  if (type !== SERVICE_ACCOUNT_CREDENTIAL_TYPE || !workloadType || !workloadId || !spaceId) {
    return undefined;
  }
  return { workloadType, workloadId, spaceId, expectedServiceAccountId };
};

/**
 * Whether a stored credential runs as the same workload and pin as `runAs`. A credential that isn't
 * a service account matches only the absence of `runAs`.
 */
export const credentialMatchesRunAs = (credential?: TaskCredential, runAs?: TaskRunAs): boolean => {
  const serviceAccountCredential =
    credential?.type === SERVICE_ACCOUNT_CREDENTIAL_TYPE ? credential : undefined;
  if (!serviceAccountCredential || !runAs) {
    return !serviceAccountCredential && !runAs;
  }
  return (
    serviceAccountCredential.workloadType === runAs.workloadType &&
    serviceAccountCredential.workloadId === runAs.workloadId &&
    serviceAccountCredential.spaceId === runAs.spaceId &&
    (serviceAccountCredential.expectedServiceAccountId ?? null) === runAs.expectedServiceAccountId
  );
};
