/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { MaterializeContext, MaterializeInput } from '../../common';
import { isMaterializeByReference } from '../../common';
import type { MaterializedNode } from './nodes';
import type { MaterializerRegistry } from './registry';
import type {
  MaterializeScope,
  Materializer,
  MaterializeResults,
  ScopedMaterializeClient,
} from './types';
import { createUnsupportedNode } from './unsupported';

export interface ScopedMaterializeClientDeps {
  registry: MaterializerRegistry;
  scope: MaterializeScope;
  isEnabled: () => Promise<boolean>;
  logger: Logger;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const loadConfig = async (
  materializer: Materializer,
  input: MaterializeInput,
  scope: MaterializeScope
): Promise<unknown> => {
  if (!isMaterializeByReference(input)) {
    return input.config;
  }
  if (!materializer.load) {
    throw new Error(
      i18n.translate('xpack.isomer.materialize.noByReference', {
        defaultMessage: 'Saved objects of type "{type}" can only be materialized by value.',
        values: { type: input.type },
      })
    );
  }
  return materializer.load(input.id, scope);
};

const run = (
  materializer: Materializer,
  config: unknown,
  context: MaterializeContext
): MaterializedNode => {
  const plan = materializer.plan(config, context);
  if (!Array.isArray(plan)) {
    return plan;
  }
  const [request] = plan;
  if (request) {
    return createUnsupportedNode(
      i18n.translate('xpack.isomer.materialize.noExecutor', {
        defaultMessage: 'Kibana cannot run "{kind}" data requests for materialization.',
        values: { kind: request.kind },
      }),
      materializer.describe?.(config)
    );
  }
  const results: MaterializeResults = { tables: [], nodes: [] };
  return materializer.map(config, results, { context });
};

/** Materializes saved objects as the user `scope` belongs to. */
export const createScopedMaterializeClient = ({
  registry,
  scope,
  isEnabled,
  logger,
}: ScopedMaterializeClientDeps): ScopedMaterializeClient => ({
  materialize: async (input, context = {}) => {
    if (!(await isEnabled())) {
      return createUnsupportedNode(
        i18n.translate('xpack.isomer.materialize.disabled', {
          defaultMessage: 'Materialization is not enabled in this Kibana.',
        })
      );
    }
    const materializer = registry.get(input.type);
    if (!materializer) {
      return createUnsupportedNode(
        i18n.translate('xpack.isomer.materialize.noMaterializer', {
          defaultMessage: 'Kibana cannot materialize saved objects of type "{type}".',
          values: { type: input.type },
        })
      );
    }

    let config: unknown;
    try {
      config = materializer.parse(await loadConfig(materializer, input, scope));
    } catch (error) {
      logger.debug(
        `Could not load the ${input.type} config to materialize: ${errorMessage(error)}`
      );
      return createUnsupportedNode(
        i18n.translate('xpack.isomer.materialize.invalidConfig', {
          defaultMessage: 'The {type} config could not be read: {message}',
          values: { type: input.type, message: errorMessage(error) },
        })
      );
    }

    try {
      return run(materializer, config, context);
    } catch (error) {
      logger.warn(`Materializing a ${input.type} config failed: ${errorMessage(error)}`);
      return createUnsupportedNode(
        i18n.translate('xpack.isomer.materialize.failed', {
          defaultMessage: 'Materializing this {type} failed: {message}',
          values: { type: input.type, message: errorMessage(error) },
        }),
        materializer.describe?.(config)
      );
    }
  },

  filtersForSelection: async ({ node }) => {
    throw new Error(
      i18n.translate('xpack.isomer.materialize.selectionUnsupported', {
        defaultMessage: 'Kibana cannot turn a selection on node "{node}" into filters.',
        values: { node },
      })
    );
  },
});
