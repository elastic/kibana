/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverCompare from 'semver/functions/compare';
import type { EvaluatorDefinitionClient } from '../storage/evaluators/evaluator_definition_client';
import { groundednessEvaluator } from './groundedness';
import { correctnessEvaluator } from './correctness';
import {
  inputTokensEvaluatorDef,
  latencyEvaluatorDef,
  outputTokensEvaluatorDef,
  toolCallsEvaluatorDef,
} from './trace_metrics';
import { compileUserDefinedEvaluator } from './user_defined/compile';
import type { EvaluatorDefinition, EvaluatorRegistry, ScopedEvaluatorRegistry } from './types';

const BUILT_IN_EVALUATORS: readonly EvaluatorDefinition[] = [
  groundednessEvaluator,
  correctnessEvaluator,
  latencyEvaluatorDef,
  inputTokensEvaluatorDef,
  outputTokensEvaluatorDef,
  toolCallsEvaluatorDef,
];

const latestOf = (versions: Map<string, EvaluatorDefinition>): EvaluatorDefinition | undefined => {
  const latestVersion = [...versions.keys()].sort((a, b) => semverCompare(b, a))[0];
  return latestVersion ? versions.get(latestVersion) : undefined;
};

/** Resolves built-in and persisted evaluators, with built-ins winning name collisions. */
export const createEvaluatorRegistry = ({
  getDefinitionClient,
}: {
  getDefinitionClient?: (options: { spaceId: string }) => EvaluatorDefinitionClient | undefined;
} = {}): EvaluatorRegistry => {
  const builtIns = new Map<string, Map<string, EvaluatorDefinition>>();

  for (const definition of BUILT_IN_EVALUATORS) {
    const versionsForName = builtIns.get(definition.name) ?? new Map<string, EvaluatorDefinition>();
    versionsForName.set(definition.version, definition);
    builtIns.set(definition.name, versionsForName);
  }

  const getBuiltIn = (name: string, version?: string): EvaluatorDefinition | undefined => {
    const versionsForName = builtIns.get(name);
    if (!versionsForName) {
      return undefined;
    }

    return version ? versionsForName.get(version) : latestOf(versionsForName);
  };

  const listBuiltIns = (): EvaluatorDefinition[] =>
    [...builtIns.values()]
      .map(latestOf)
      .filter((definition): definition is EvaluatorDefinition => definition !== undefined);

  const asScoped = ({ spaceId }: { spaceId: string }): ScopedEvaluatorRegistry => {
    const definitionClient = getDefinitionClient?.({ spaceId });

    return {
      async list() {
        if (!definitionClient) {
          return listBuiltIns();
        }

        const persisted = await definitionClient.listLatest();
        const visiblePersisted = persisted.filter((document) => !builtIns.has(document.name));

        return [...listBuiltIns(), ...visiblePersisted.map(compileUserDefinedEvaluator)];
      },
      async get(name, version) {
        const builtIn = getBuiltIn(name, version);
        if (builtIn || builtIns.has(name) || !definitionClient) {
          return builtIn;
        }

        const document = version
          ? await definitionClient.getVersion(name, version)
          : await definitionClient.getLatest(name);

        return document ? compileUserDefinedEvaluator(document) : undefined;
      },
    };
  };

  return {
    isBuiltIn: (name) => builtIns.has(name),
    asScoped,
  };
};
