/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getContentHash } from './icon';
import { parseCatalogContract } from './parse_spec';
import { buildContract } from './build_spec';
import type { BuiltVersion } from './types';

/** Parses a contract YAML document and builds the versioned ConnectorSpec body. */
export const buildVersion = (yaml: string): BuiltVersion => {
  const contract = parseCatalogContract(yaml);
  return {
    id: contract.id,
    version: contract.version,
    contentHash: getContentHash(yaml),
    contract,
    spec: buildContract(contract),
  };
};
