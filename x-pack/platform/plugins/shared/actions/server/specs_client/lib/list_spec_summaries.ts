/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpecSummary } from '../../../common/connector_spec';
import type { ActionTypeRegistryContract } from '../../types';
import { serializeSpecSummary } from './serialize_spec_summary';

/** Summaries of every spec-backed connector type in the registry. Needs no request. */
export const listSpecSummaries = (
  registry: Pick<ActionTypeRegistryContract, 'getSpec' | 'list'>
): ConnectorSpecSummary[] =>
  registry.list().flatMap((type) => {
    const spec = registry.getSpec(type.id);
    return spec ? [serializeSpecSummary({ spec, type })] : [];
  });
