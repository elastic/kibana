/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, ValidationError } from '@kbn/isomer';
import type { MaterializedNode } from './nodes';

type NodeValidator = (composition: Composition) => { errors: ValidationError[] };

const COMPOSITION_NODE_PATH = /^body\[0\]\.?/;

const createValidator = async (): Promise<NodeValidator> => {
  const [
    { createCompositionValidator },
    { componentsPrimitives },
    { chartsValidationDefinitions },
  ] = await Promise.all([
    import('@kbn/isomer'),
    import('@kbn/isomer-components'),
    import('./charts_definitions'),
  ]);
  // Materialized `unsupported` nodes carry provenance, so the charts pack's definition replaces the
  // components pack's.
  const chartsTypes = new Set(chartsValidationDefinitions.map(({ type }) => type));
  return createCompositionValidator([
    ...componentsPrimitives.filter(({ type }) => !chartsTypes.has(type)),
    ...chartsValidationDefinitions,
  ]);
};

/**
 * Validates a node against the Isomer version Kibana pins, the way the runtime validates a
 * composition: the input budget, then the charts and components packs' schemas and semantic
 * passes, nested `grid` panels included. Paths are relative to the node.
 */
export const createNodeValidator = () => {
  let validator: Promise<NodeValidator> | undefined;
  return async (node: MaterializedNode): Promise<ValidationError[]> => {
    validator ??= createValidator().catch((error) => {
      validator = undefined;
      throw error;
    });
    const { errors } = (await validator)({ type: 'view', body: [node] });
    return errors.map((error) => ({
      ...error,
      path: error.path.replace(COMPOSITION_NODE_PATH, ''),
    }));
  };
};
