/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_LICENSE_HEADER } from '../constants';
import { toCamelCase, toSnakeCase } from '../utils';

export function renderSkillTestFile(opts: { name: string }): string {
  const varName = `${toCamelCase(opts.name)}Skill`;
  const fileName = `${toSnakeCase(opts.name)}_skill`;

  return `${ELASTIC_LICENSE_HEADER}

import { validateSkillDefinition } from '@kbn/agent-builder-server/skills';
import { ${varName} } from './${fileName}';

describe('${varName}', () => {
  it('passes schema validation', async () => {
    await expect(validateSkillDefinition(${varName})).resolves.toBeDefined();
  });

  it('has a non-empty description', () => {
    expect(${varName}.description.length).toBeGreaterThan(0);
    expect(${varName}.description.length).toBeLessThanOrEqual(1024);
  });

  it('has non-empty content', () => {
    expect(${varName}.content.length).toBeGreaterThan(0);
  });

  it('has a valid name', () => {
    expect(${varName}.name).toMatch(/^[a-z0-9-_]+$/);
    expect(${varName}.name.length).toBeLessThanOrEqual(64);
  });

  it('has a valid basePath starting with skills/', () => {
    expect(${varName}.basePath).toMatch(/^skills\\//);
  });
});
`;
}

export function renderToolTestFile(opts: {
  name: string;
  toolId: string;
}): string {
  const fnName = `get${opts.name.split(/[-_]/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')}Tool`;
  const fileName = `${opts.name.replace(/-/g, '_')}_tool`;

  return `${ELASTIC_LICENSE_HEADER}

import { ${fnName} } from './${fileName}';

describe('${fnName}', () => {
  const tool = ${fnName}();

  it('has the correct id', () => {
    expect(tool.id).toBe('${opts.toolId}');
  });

  it('has a non-empty description', () => {
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('has a valid schema', () => {
    expect(tool.schema).toBeDefined();
    expect(tool.schema.parse).toBeDefined();
  });

  it('has a handler function', () => {
    expect(typeof tool.handler).toBe('function');
  });
});
`;
}
