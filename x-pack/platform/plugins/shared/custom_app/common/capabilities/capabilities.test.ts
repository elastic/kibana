/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { appDocumentSchema } from '@kbn/custom-app-common';
import { getInterpolatedText } from '@kbn/custom-app-common';
import { badgeCapability } from './badge/manifest';
import { statCapability } from './stat/manifest';
import { collectSources } from '@kbn/custom-app-common';
import { registerBuiltinCapabilities } from './manifests';
import {
  checkCapability,
  defineCapability,
  describeCapability,
  getCapability,
  registerCapability,
} from '@kbn/custom-app-registry';

const documentWith = (node: Record<string, unknown>) => ({
  state: {},
  root: { type: 'stack', id: 'root', direction: 'vertical', children: [node] },
});

describe('capabilities', () => {
  it('registers what ships with custom apps, once', () => {
    registerBuiltinCapabilities();
    registerBuiltinCapabilities();
    expect(getCapability('badge')).toBe(badgeCapability);
  });

  it('does not take a second capability with the same id', () => {
    const other = defineCapability({ ...badgeCapability, version: 2 });
    expect(() => registerCapability(other)).toThrow('registered already');
  });

  it('has nothing wrong with the badge', () => {
    expect(checkCapability(badgeCapability)).toEqual([]);
  });

  it('finds what is wrong with a capability', () => {
    const broken = defineCapability({
      kind: 'component',
      id: 'Broken-One',
      version: 0,
      props: z.object({ text: z.string() }),
      doc: { summary: 'x', whenToUse: 'y', example: { type: 'other', id: 'a' } },
      interpolated: ['text'],
      migrations: { 3: (props) => props },
    });
    expect(checkCapability(broken)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('lowercase words'),
        expect.stringContaining('whole number'),
        expect.stringContaining('"text" has no description'),
        expect.stringContaining('migration from version 3'),
        expect.stringContaining('does not validate'),
        expect.stringContaining('must be of type "Broken-One"'),
      ])
    );
  });

  it('puts a badge in a document through its manifest', () => {
    const parsed = appDocumentSchema.safeParse(
      documentWith({ type: 'badge', id: 'status', text: 'Healthy', color: 'success' })
    );
    expect(parsed.success).toBe(true);
    expect(
      appDocumentSchema.safeParse(documentWith({ type: 'badge', id: 'status', text: '' })).success
    ).toBe(false);
    expect(
      appDocumentSchema.safeParse(
        documentWith({ type: 'badge', id: 'status', text: 'Up', color: 'purple' })
      ).success
    ).toBe(false);
  });

  it('takes the text that can use values from the manifest', () => {
    expect(
      getInterpolatedText({
        type: 'badge',
        id: 'status',
        text: 'Up {{state.region}}',
        color: 'default',
      })
    ).toEqual([{ prop: 'text', text: 'Up {{state.region}}' }]);
  });

  it('describes a capability for an LLM from its manifest', () => {
    const line = describeCapability(badgeCapability);
    expect(line).toContain('- badge { text, color?: "default"');
    expect(line).toContain('A short coloured word, such as a status.');
  });

  describe('stat', () => {
    it('has nothing wrong with it', () => {
      expect(checkCapability(statCapability)).toEqual([]);
    });

    it('takes its data from the runtime, by what its manifest says', () => {
      const document = documentWith({
        type: 'stat',
        id: 'errors',
        title: 'Errors',
        query: 'FROM logs-* | STATS n = COUNT(*)',
      });
      const parsed = appDocumentSchema.parse(document);
      expect(collectSources(parsed.root)).toEqual({
        errors: { type: 'esql', query: 'FROM logs-* | STATS n = COUNT(*)' },
      });
    });

    it('needs a query or a source, and one of them only', () => {
      const none = appDocumentSchema.safeParse(documentWith({ type: 'stat', id: 'a', title: 'A' }));
      expect(none.success).toBe(false);
      const both = appDocumentSchema.safeParse(
        documentWith({
          type: 'stat',
          id: 'a',
          title: 'A',
          query: 'FROM x | LIMIT 1',
          source: { type: 'cases', count: true },
        })
      );
      expect(both.success).toBe(false);
    });

    it('describes itself for an LLM from its manifest', () => {
      const line = describeCapability(statCapability);
      expect(line).toContain('- stat { title, query?, source? }');
      expect(line).toContain('"count": true');
    });
  });

  it('takes a capability that another plugin registers, with no edit to the built-in ones', async () => {
    await jest.isolateModulesAsync(async () => {
      const { z: zod } = await import('@kbn/zod/v4');
      const registry = await import('@kbn/custom-app-registry');
      (await import('./manifests')).registerBuiltinCapabilities();
      registry.registerCapability(
        registry.defineCapability({
          kind: 'component',
          id: 'gauge',
          version: 1,
          props: zod.object({ title: zod.string().describe('What it measures.') }),
          doc: {
            summary: 'A dial.',
            whenToUse: 'For a value in a range.',
            example: { type: 'gauge', id: 'load', title: 'Load' },
          },
        })
      );
      const { appDocumentSchema: schema } = await import('@kbn/custom-app-common');
      expect(
        schema.safeParse(documentWith({ type: 'gauge', id: 'load', title: 'Load' })).success
      ).toBe(true);
      expect(schema.safeParse(documentWith({ type: 'gauge', id: 'load' })).success).toBe(false);
    });
  });
});
