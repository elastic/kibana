/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { MaterializeContext, MaterializeInput } from '../../common';
import type { MaterializedNode } from './nodes';
import type { MaterializerRegistry } from './registry';
import type {
  MaterializeDescription,
  MaterializeScope,
  Materializer,
  MaterializeResults,
  ScopedMaterializeClient,
} from './types';
import { createUnsupportedNode } from './unsupported';

interface ScopedMaterializeClientDeps {
  registry: MaterializerRegistry;
  scope: MaterializeScope;
  isEnabled: () => Promise<boolean>;
  validateNode: (node: MaterializedNode) => Promise<void>;
  logger: Logger;
}

const MAX_UNSUPPORTED_REASON_LENGTH = 10_000;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isByReference = (
  input: MaterializeInput
): input is Extract<MaterializeInput, { id: string }> =>
  'id' in input && typeof input.id === 'string';

const loadConfig = async (
  materializer: Materializer,
  input: MaterializeInput,
  scope: MaterializeScope
): Promise<unknown> => {
  if (!isByReference(input)) {
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

const run = async (
  materializer: Materializer,
  config: unknown,
  context: MaterializeContext,
  describe: () => MaterializeDescription | undefined,
  unsupported: (reason: string, description?: MaterializeDescription) => Promise<MaterializedNode>,
  validateNode: (node: MaterializedNode) => Promise<void>
): Promise<MaterializedNode> => {
  const plan = materializer.plan(config, context);
  let node: MaterializedNode;
  if (!Array.isArray(plan)) {
    node = plan;
  } else {
    const [request] = plan;
    if (request) {
      return unsupported(
        i18n.translate('xpack.isomer.materialize.noExecutor', {
          defaultMessage: 'Kibana cannot run "{kind}" data requests for materialization.',
          values: { kind: request.kind },
        }),
        describe()
      );
    }
    const results: MaterializeResults = { tables: [], nodes: [] };
    node = materializer.map(config, results, { context });
  }
  await validateNode(node);
  return node;
};

/** Materializes saved objects as the user `scope` belongs to. */
export const createScopedMaterializeClient = ({
  registry,
  scope,
  isEnabled,
  validateNode,
  logger,
}: ScopedMaterializeClientDeps): ScopedMaterializeClient => ({
  /** Creates and validates a node, using an `unsupported` primitive for failures. */
  materialize: async (input, context = {}) => {
    if (!(await isEnabled())) {
      const node = createUnsupportedNode(
        i18n.translate('xpack.isomer.materialize.disabled', {
          defaultMessage: 'Materialization is not enabled in this Kibana.',
        })
      );
      await validateNode(node);
      return node;
    }
    const materializer = registry.get(input.type);
    if (!materializer) {
      const node = createUnsupportedNode(
        i18n.translate('xpack.isomer.materialize.noMaterializer', {
          defaultMessage: 'Kibana cannot materialize saved objects of type "{type}".',
          values: { type: input.type },
        })
      );
      await validateNode(node);
      return node;
    }

    const describe = (): MaterializeDescription | undefined => {
      try {
        return materializer.describe?.(config);
      } catch (error) {
        logger.warn(`Describing a ${input.type} config failed: ${errorMessage(error)}`);
        return undefined;
      }
    };
    const unsupported = async (
      reason: string,
      description?: MaterializeDescription
    ): Promise<MaterializedNode> => {
      const boundedReason = reason.slice(0, MAX_UNSUPPORTED_REASON_LENGTH);
      const node = createUnsupportedNode(boundedReason, description);
      try {
        await validateNode(node);
        return node;
      } catch (error) {
        if (!description) {
          throw error;
        }
        logger.warn(
          `Validating the ${input.type} unsupported description failed: ${errorMessage(error)}`
        );
        const fallback = createUnsupportedNode(boundedReason);
        await validateNode(fallback);
        return fallback;
      }
    };

    let config: unknown;
    try {
      config = materializer.parse(await loadConfig(materializer, input, scope));
    } catch (error) {
      logger.debug(
        `Could not load the ${input.type} config to materialize: ${errorMessage(error)}`
      );
      return unsupported(
        i18n.translate('xpack.isomer.materialize.invalidConfig', {
          defaultMessage: 'The {type} config could not be read: {message}',
          values: { type: input.type, message: errorMessage(error) },
        })
      );
    }

    try {
      return await run(materializer, config, context, describe, unsupported, validateNode);
    } catch (error) {
      logger.warn(`Materializing a ${input.type} config failed: ${errorMessage(error)}`);
      return unsupported(
        i18n.translate('xpack.isomer.materialize.failed', {
          defaultMessage: 'Materializing this {type} failed: {message}',
          values: { type: input.type, message: errorMessage(error) },
        }),
        describe()
      );
    }
  },

  /** Rejects until the materialization pipeline implements selection conversion. */
  filtersForSelection: async ({ node }) => {
    throw new Error(
      i18n.translate('xpack.isomer.materialize.selectionUnsupported', {
        defaultMessage: 'Kibana cannot turn a selection on node "{node}" into filters.',
        values: { node },
      })
    );
  },
});
