/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChangeHistoryInvalidPrimaryStoreVersionError } from './change_history_invalid_primary_store_version_error';

const decodeBase64 = (base64: string) => Buffer.from(base64, 'base64').toString('utf8');

/**
 * Decode Saved Objects opaque `version` (base64 JSON `[seqNo, primaryTerm]`) into OCC fields
 * stored on change-history documents. Matches core `decodeVersion` wire format.
 */
export const decodePrimaryStoreVersion = (
  primaryStoreVersion: string
): { seqNo: number; primaryTerm: number } => {
  try {
    if (typeof primaryStoreVersion !== 'string') {
      throw new TypeError();
    }

    const seqParams = JSON.parse(decodeBase64(primaryStoreVersion)) as [number, number];

    if (
      !Array.isArray(seqParams) ||
      seqParams.length !== 2 ||
      !Number.isInteger(seqParams[0]) ||
      !Number.isInteger(seqParams[1])
    ) {
      throw new TypeError();
    }

    return {
      seqNo: seqParams[0],
      primaryTerm: seqParams[1],
    };
  } catch {
    throw new ChangeHistoryInvalidPrimaryStoreVersionError(
      `Invalid primaryStoreVersion [${primaryStoreVersion}]`,
      primaryStoreVersion
    );
  }
};
