/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { capabilityNodeSchema } from './capability_node_schema';
import type { CapabilityManifest } from './define_capability';

type JsonSchema = Record<string, unknown>;

const toJsonSchema = <Id extends string, Shape extends z.ZodRawShape>(
  manifest: CapabilityManifest<Id, Shape>
): JsonSchema =>
  z.toJSONSchema(manifest.props, { io: 'input', unrepresentable: 'any' }) as JsonSchema;

/**
 * What is wrong with a capability, in words: the same checks for every capability. Empty when it is
 * fit to be registered.
 */
export const checkCapability = <Id extends string, Shape extends z.ZodRawShape>(
  manifest: CapabilityManifest<Id, Shape>
): string[] => {
  const problems: string[] = [];
  const name = `Capability "${manifest.id}"`;

  if (!/^[a-z][a-z0-9_]*$/.test(manifest.id)) {
    problems.push(`${name}: the id must be lowercase words joined by underscores`);
  }
  if (!Number.isInteger(manifest.version) || manifest.version < 1) {
    problems.push(`${name}: the version must be a whole number from 1`);
  }

  const properties = (toJsonSchema(manifest).properties ?? {}) as Record<string, JsonSchema>;
  Object.entries(properties).forEach(([property, schema]) => {
    if (typeof schema.description !== 'string' || schema.description.trim() === '') {
      problems.push(`${name}: the setting "${property}" has no description`);
    }
  });

  const known = new Set(Object.keys(properties));
  [
    ...(manifest.interpolated ?? []),
    ...Object.keys(manifest.bound ?? {}).map((path) => path.split('.')[0]),
  ].forEach((property) => {
    if (!known.has(property)) problems.push(`${name}: "${property}" is not one of its settings`);
  });

  Object.keys(manifest.migrations ?? {}).forEach((step) => {
    const from = Number(step);
    if (!Number.isInteger(from) || from < 1 || from >= manifest.version) {
      problems.push(`${name}: a migration from version ${step} does not lead to a version it has`);
    }
  });

  const example = capabilityNodeSchema(manifest).safeParse(manifest.doc.example);
  if (!example.success) {
    problems.push(`${name}: the example does not validate: ${example.error.issues[0]?.message}`);
  }
  if (manifest.doc.example.type !== manifest.id) {
    problems.push(`${name}: the example must be of type "${manifest.id}"`);
  }
  return problems;
};
