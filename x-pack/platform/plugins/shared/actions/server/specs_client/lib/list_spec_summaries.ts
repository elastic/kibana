/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ConnectorSpecSummary } from '../../../common/connector_spec';
import type { UnsecuredSpecsClientOpts, GetAllSpecsParams } from '../types';
import { serializeSpecSummary } from './serialize_spec_summary';

export const listSpecSummaries = (
  { actionTypeRegistry }: UnsecuredSpecsClientOpts,
  { featureId }: GetAllSpecsParams = {}
): ConnectorSpecSummary[] =>
  actionTypeRegistry.list({ featureId }).flatMap((type) => {
    if (type.source !== ACTION_TYPE_SOURCES.spec) {
      return [];
    }
    const spec = actionTypeRegistry.getSpec(type.id);
    if (!spec) {
      return [];
    }
    return [serializeSpecSummary({ spec, type })];
  });
