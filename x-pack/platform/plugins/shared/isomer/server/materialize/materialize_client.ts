/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { i18n } from '@kbn/i18n';
import type { ValidationError } from '@kbn/isomer';
import type { MaterializeContext, MaterializeInput } from '../../common';
import { isMaterializeByReference } from '../../common';
import { executeEsql } from './executors/esql';
import { DATA_REQUEST_TIMEOUT_MS, MAX_MATERIALIZE_DEPTH, MAX_ROWS_PER_REQUEST } from './limits';
import type { MaterializedNode } from './nodes';
import { runPipeline } from './pipeline';
import type { MaterializerRegistry } from './registry';
import type { MaterializeScope, Materializer, ScopedMaterializeClient } from './types';
import { createUnsupportedNode } from './unsupported';

export interface MaterializeLimits {
  maxRowsPerRequest: number;
  dataRequestTimeoutMs: number;
  maxDepth: number;
}

export interface ScopedMaterializeClientDeps {
  registry: MaterializerRegistry;
  scope: MaterializeScope;
  isEnabled: () => Promise<boolean>;
  logger: Logger;
  /** The user's search client. */
  search: Pick<IScopedSearchClient, 'esql'>;
  /** The node's validation errors against the runtime's packs. */
  validate: (node: MaterializedNode) => Promise<ValidationError[]>;
  kibanaVersion: string;
  now?: () => Date;
  limits?: Partial<MaterializeLimits>;
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

/** Materializes saved objects as the user `scope` belongs to. */
export const createScopedMaterializeClient = ({
  registry,
  scope,
  isEnabled,
  logger,
  search,
  validate,
  kibanaVersion,
  now = () => new Date(),
  limits: {
    maxRowsPerRequest = MAX_ROWS_PER_REQUEST,
    dataRequestTimeoutMs = DATA_REQUEST_TIMEOUT_MS,
    maxDepth = MAX_MATERIALIZE_DEPTH,
  } = {},
}: ScopedMaterializeClientDeps): ScopedMaterializeClient => {
  const materializeAt = async (
    input: MaterializeInput,
    context: MaterializeContext,
    depth: number
  ): Promise<MaterializedNode> => {
    const materializer = registry.get(input.type);
    if (!materializer) {
      return createUnsupportedNode(
        i18n.translate('xpack.isomer.materialize.noMaterializer', {
          defaultMessage: 'Kibana cannot materialize saved objects of type "{type}".',
          values: { type: input.type },
        })
      );
    }
    if (depth > maxDepth) {
      return createUnsupportedNode(
        i18n.translate('xpack.isomer.materialize.tooDeep', {
          defaultMessage: 'This {type} is nested more than {maxDepth} levels deep.',
          values: { type: input.type, maxDepth },
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
      return await runPipeline(
        {
          type: input.type,
          materializer,
          config,
          context,
          ...(isMaterializeByReference(input) ? { savedObjectId: input.id } : {}),
        },
        {
          executeEsql: (request, requestContext, index) =>
            executeEsql(request, requestContext, index, {
              search,
              abortSignal: scope.abortSignal,
              maxRows: maxRowsPerRequest,
              timeoutMs: dataRequestTimeoutMs,
            }),
          materialize: (nestedInput, nestedContext) =>
            materializeAt(nestedInput, nestedContext, depth + 1),
          validate,
          kibanaVersion,
          now,
        }
      );
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
  };

  return {
    materialize: async (input, context = {}) => {
      if (!(await isEnabled())) {
        return createUnsupportedNode(
          i18n.translate('xpack.isomer.materialize.disabled', {
            defaultMessage: 'Materialization is not enabled in this Kibana.',
          })
        );
      }
      return materializeAt(input, context, 0);
    },

    filtersForSelection: async ({ node }) => {
      throw new Error(
        i18n.translate('xpack.isomer.materialize.selectionUnsupported', {
          defaultMessage: 'Kibana cannot turn a selection on node "{node}" into filters.',
          values: { node },
        })
      );
    },
  };
};
