/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderIacTemplateIntegration } from '../../types';

type InputsByTemplateByPackage = Map<string, Map<string, Set<string>>>;

const indexInputs = (
  integrations: RenderIacTemplateIntegration[],
  into: InputsByTemplateByPackage = new Map()
): InputsByTemplateByPackage => {
  for (const { name, policyTemplates } of integrations) {
    const templates = into.get(name) ?? new Map<string, Set<string>>();
    into.set(name, templates);
    for (const { name: templateName, enabledInputs } of policyTemplates) {
      const inputs = templates.get(templateName) ?? new Set<string>();
      templates.set(templateName, inputs);
      enabledInputs.forEach((input) => inputs.add(input));
    }
  }
  return into;
};

/** Code-unit ordering on map-entry keys, as `buildIacIntegrations` orders its result. */
const byKey = <T>([a]: [string, T], [b]: [string, T]): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The union of two render inputs: one entry per package and policy template with the enabled
 * inputs unioned, ordered as `buildIacIntegrations` orders its result.
 */
export const mergeIacIntegrations = (
  first: RenderIacTemplateIntegration[],
  second: RenderIacTemplateIntegration[]
): RenderIacTemplateIntegration[] =>
  [...indexInputs(second, indexInputs(first)).entries()].sort(byKey).map(([name, templates]) => ({
    name,
    policyTemplates: [...templates.entries()].sort(byKey).map(([templateName, inputs]) => ({
      name: templateName,
      enabledInputs: [...inputs].sort(),
    })),
  }));

/**
 * What `wanted` adds to `covered`, as `"<template> (<inputs>)"` per policy template, listing only
 * the inputs `covered` lacks.
 */
export const diffIacIntegrations = (
  covered: RenderIacTemplateIntegration[],
  wanted: RenderIacTemplateIntegration[]
): string[] => {
  const coveredInputs = indexInputs(covered);
  return wanted.flatMap(({ name, policyTemplates }) =>
    policyTemplates.flatMap(({ name: templateName, enabledInputs }) => {
      const known = coveredInputs.get(name)?.get(templateName);
      const missing = enabledInputs.filter((input) => !known?.has(input));
      return missing.length > 0 ? [`${templateName} (${missing.join(', ')})`] : [];
    })
  );
};
