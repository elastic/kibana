/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry, DeploymentMethod } from '../../aws_service_matrix';
import { getSourcePolicyName } from '../authenticate_and_deploy_step/deploy_group_helpers';
import { supportsIntegrationSettings } from './integration_settings';

const DUPLICATE_SUFFIX = '[Duplicate]';

const normalize = (s: string) => s.trim().toLowerCase();

/**
 * Returns the next unique duplicate name for a service, given the set of names
 * already in use. Produces "Foo [Duplicate]", then "Foo [Duplicate 2]",
 * "Foo [Duplicate 3]", etc.
 *
 * Uses the same case-insensitive, trimmed comparison as `isDuplicateNameTaken`
 * so the suggested name always passes modal validation.
 */
export function buildDuplicateName(baseName: string, existingNames: string[]): string {
  const existingSet = new Set(existingNames.map(normalize));

  const first = `${baseName} ${DUPLICATE_SUFFIX}`;
  if (!existingSet.has(normalize(first))) return first;

  let n = 2;
  while (true) {
    const candidate = `${baseName} [Duplicate ${n}]`;
    if (!existingSet.has(normalize(candidate))) return candidate;
    n++;
  }
}

/**
 * Returns true when `name` would collide with any entry in `existingNames`.
 * Used for inline validation in the modal.
 */
export function isDuplicateNameTaken(name: string, existingNames: string[]): boolean {
  return existingNames.some((n) => normalize(n) === normalize(name));
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether `name` is one `buildDuplicateName` generates from `baseName`, i.e. the user kept it. */
export function isGeneratedDuplicateName(name: string, baseName: string): boolean {
  return new RegExp(`^${escapeRegExp(baseName)} \\[Duplicate( \\d+)?\\]$`, 'i').test(name.trim());
}

/**
 * The new name of a duplicate whose namespace changed, when its name is still the generated one:
 * generated again from the base name for the new namespace. Undefined when the name stays.
 *
 * More than one previous base name can apply: a duplicate with no namespace of its own follows the
 * global namespace, which may have changed since its name was generated.
 */
export function getRenamedDuplicate(
  currentName: string,
  /** The base names the current name may have been generated from. */
  previousBaseNames: string[],
  nextBaseName: string,
  otherNames: string[]
): string | undefined {
  const generatedFrom = previousBaseNames.find((base) =>
    isGeneratedDuplicateName(currentName, base)
  );
  if (generatedFrom === undefined || generatedFrom === nextBaseName) return undefined;
  return buildDuplicateName(nextBaseName, otherNames);
}

export interface DuplicateNamingContext {
  integrationName: string;
  globalNamespace: string;
  bareNamePackage: string;
  deploymentMethod: DeploymentMethod | undefined;
}

/**
 * What a duplicate's generated name is built from. A duplicate's name is the name of its policy, so
 * this is the policy name an original of the service would get in the duplicate's namespace, or
 * the service name without an integration name.
 */
export function getDuplicateBaseName(
  service: AwsServiceMatrixEntry,
  namespace: string,
  { integrationName, globalNamespace, bareNamePackage, deploymentMethod }: DuplicateNamingContext,
  /** Whether an empty namespace means the global one, as it does for the deployed policy. */
  inheritGlobal: boolean = true
): string {
  return integrationName.trim() && supportsIntegrationSettings(service, deploymentMethod)
    ? getSourcePolicyName(
        integrationName,
        service.packageName,
        namespace || (inheritGlobal ? globalNamespace : ''),
        bareNamePackage
      )
    : service.name;
}
