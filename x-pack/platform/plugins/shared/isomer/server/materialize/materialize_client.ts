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
import { executeEsql } from './executors/esql';
import type { KitServices } from './kit/create_kit';
import { createMaterializeKit } from './kit/create_kit';
import type { SelectionServices } from './selection/filters_for_selection';
import { filtersForSelection } from './selection/filters_for_selection';
import { DATA_REQUEST_TIMEOUT_MS, MAX_MATERIALIZE_DEPTH, MAX_ROWS_PER_REQUEST } from './limits';
import type { MaterializedNode, MaterializedNodeSource } from './nodes';
import { isUnsupportedNode } from './nodes';
import { runPipeline } from './pipeline';
import type { MaterializerRegistry } from './registry';
import type {
  MaterializeDescription,
  MaterializeScope,
  Materializer,
  ScopedMaterializeClient,
} from './types';
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
  /** Whether every index a pattern matches maps a field, checked as the user. */
  hasField?: (indexPattern: string, field: string) => Promise<boolean>;
  /** The node's validation errors against the runtime's packs, with paths relative to the node. */
  validate: (node: MaterializedNode) => Promise<ValidationError[]>;
  /** The user's field formats and settings, read on first use. */
  getKitServices: () => Promise<KitServices>;
  /** The user's data views and aggs, which selections resolve against. */
  getSelectionServices: () => Promise<SelectionServices>;
  kibanaVersion: string;
  now?: () => Date;
  limits?: Partial<MaterializeLimits>;
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

/** Materializes saved objects as the user `scope` belongs to. */
export const createScopedMaterializeClient = ({
  registry,
  scope,
  isEnabled,
  logger,
  search,
  hasField,
  validate,
  getKitServices,
  getSelectionServices,
  kibanaVersion,
  now = () => new Date(),
  limits: {
    maxRowsPerRequest = MAX_ROWS_PER_REQUEST,
    dataRequestTimeoutMs = DATA_REQUEST_TIMEOUT_MS,
    maxDepth = MAX_MATERIALIZE_DEPTH,
  } = {},
}: ScopedMaterializeClientDeps): ScopedMaterializeClient => {
  /** Throws when `node` does not validate against the runtime's packs. */
  const validateNode = async (node: MaterializedNode): Promise<void> => {
    const errors = await validate(node);
    if (errors.length > 0) {
      throw new Error(errors.map(({ path, message }) => `${path}: ${message}`).join('\n'));
    }
  };

  let services: Promise<KitServices> | undefined;
  const kitServices = () => {
    services ??= getKitServices().catch((error) => {
      services = undefined;
      throw error;
    });
    return services;
  };

  /** A validated `unsupported` node, dropping a description that does not validate. */
  const unsupportedFor =
    (type: string) =>
    async (
      reason: string,
      description?: MaterializeDescription,
      source?: MaterializedNodeSource
    ): Promise<MaterializedNode> => {
      const boundedReason = reason.slice(0, MAX_UNSUPPORTED_REASON_LENGTH);
      const node = createUnsupportedNode(boundedReason, description, source);
      try {
        await validateNode(node);
        return node;
      } catch (error) {
        if (!description) {
          throw error;
        }
        logger.warn(
          `Validating the ${type} unsupported description failed: ${errorMessage(error)}`
        );
        const fallback = createUnsupportedNode(boundedReason, undefined, source);
        await validateNode(fallback);
        return fallback;
      }
    };

  const materializeAt = async (
    input: MaterializeInput,
    context: MaterializeContext,
    depth: number
  ): Promise<MaterializedNode> => {
    const unsupported = unsupportedFor(input.type);
    const materializer = registry.get(input.type);
    if (!materializer) {
      return unsupported(
        i18n.translate('xpack.isomer.materialize.noMaterializer', {
          defaultMessage: 'Kibana cannot materialize saved objects of type "{type}".',
          values: { type: input.type },
        })
      );
    }
    if (depth > maxDepth) {
      return unsupported(
        i18n.translate('xpack.isomer.materialize.tooDeep', {
          defaultMessage: 'This {type} is nested more than {maxDepth} levels deep.',
          values: { type: input.type, maxDepth },
        })
      );
    }

    const describe = (): MaterializeDescription | undefined => {
      try {
        return materializer.describe?.(config);
      } catch (error) {
        logger.warn(`Describing a ${input.type} config failed: ${errorMessage(error)}`);
        return undefined;
      }
    };

    let config: unknown;
    try {
      config = materializer.parse(await loadConfig(materializer, input, scope));
      if (materializer.resolve) {
        config = await materializer.resolve(config, scope);
      }
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
      const node = await runPipeline(
        {
          type: input.type,
          materializer,
          config,
          context,
          describe,
          spaceId: scope.request.spaceId,
          ...(isByReference(input) ? { savedObjectId: input.id } : {}),
        },
        {
          executeEsql: (request, requestContext, index) =>
            executeEsql(request, requestContext, index, {
              search,
              hasField,
              abortSignal: scope.abortSignal,
              maxRows: maxRowsPerRequest,
              timeoutMs: dataRequestTimeoutMs,
            }),
          materialize: (nestedInput, nestedContext) =>
            materializeAt(nestedInput, nestedContext, depth + 1),
          validate,
          getTimeZone: async () => (await kitServices()).settings.dateFormatTz,
          createKit: async (kitContext) => createMaterializeKit(await kitServices(), kitContext),
          kibanaVersion,
          now,
        }
      );
      if (isUnsupportedNode(node)) {
        const { reason, title, link, source } = node;
        return await unsupported(reason, { title, link }, source);
      }
      return node;
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
  };

  return {
    /** Creates and validates a node, using an `unsupported` primitive for failures. */
    materialize: async (input, context = {}) => {
      if (!(await isEnabled())) {
        return unsupportedFor(input.type)(
          i18n.translate('xpack.isomer.materialize.disabled', {
            defaultMessage: 'Materialization is not enabled in this Kibana.',
          })
        );
      }
      return materializeAt(input, context, 0);
    },

    /** Turns a selection on a materialized chart node into Kibana filters. */
    filtersForSelection: async (event, node) =>
      filtersForSelection(event, node, await getSelectionServices()),
  };
};
