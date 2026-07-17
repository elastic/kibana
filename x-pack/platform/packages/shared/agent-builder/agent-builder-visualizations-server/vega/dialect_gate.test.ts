/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { VEGA_SCHEMA } from './dialect';
import { resolveDialectGate, selectVegaCatalogId } from './dialect_gate';

const mockModel = (
  result: { catalogId?: string } | (() => never)
): { model: ScopedModel; invoke: jest.Mock } => {
  const invoke = jest.fn(async () => {
    if (typeof result === 'function') {
      return result();
    }
    return result;
  });
  const withStructuredOutput = jest.fn(() => ({ invoke }));
  return {
    model: { chatModel: { withStructuredOutput } } as unknown as ScopedModel,
    invoke,
  };
};

const mockLogger = (): Logger => ({ warn: jest.fn() } as unknown as Logger);

describe('selectVegaCatalogId', () => {
  it('returns sunburst when the classifier selects it', async () => {
    const { model } = mockModel({ catalogId: 'sunburst' });
    await expect(selectVegaCatalogId({ nlQuery: 'sunburst of services', model })).resolves.toBe(
      'sunburst'
    );
  });

  it('returns radar when the classifier selects it', async () => {
    const { model } = mockModel({ catalogId: 'radar' });
    await expect(selectVegaCatalogId({ nlQuery: 'radar of metrics', model })).resolves.toBe(
      'radar'
    );
  });

  it('returns sankey when the classifier selects it', async () => {
    const { model } = mockModel({ catalogId: 'sankey' });
    await expect(selectVegaCatalogId({ nlQuery: 'sankey of traffic', model })).resolves.toBe(
      'sankey'
    );
  });

  it('returns none for unrelated catalog values and on failure', async () => {
    const { model } = mockModel({ catalogId: 'chord' });
    await expect(selectVegaCatalogId({ nlQuery: 'chord', model })).resolves.toBe('none');

    const failing = mockModel(() => {
      throw new Error('boom');
    });
    const logger = mockLogger();
    await expect(
      selectVegaCatalogId({ nlQuery: 'anything', model: failing.model, logger })
    ).resolves.toBe('none');
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('resolveDialectGate', () => {
  it('pins Raw Vega from an existing sunburst spec without calling the classifier', async () => {
    const { model, invoke } = mockModel({ catalogId: 'none' });
    const gate = await resolveDialectGate({
      nlQuery: 'make it blue',
      existingSpec: JSON.stringify({
        $schema: VEGA_SCHEMA,
        data: [{ transform: [{ type: 'stratify' }] }],
        marks: [],
      }),
      model,
    });

    expect(gate).toMatchObject({ catalogId: 'sunburst', dialect: 'vega' });
    expect(gate.referenceExamples).toContain('Sunburst');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('pins Raw Vega radar from an existing radar spec without calling the classifier', async () => {
    const { model, invoke } = mockModel({ catalogId: 'none' });
    const gate = await resolveDialectGate({
      nlQuery: 'make it blue',
      existingSpec: JSON.stringify({
        $schema: VEGA_SCHEMA,
        scales: [{ name: 'angular' }, { name: 'radial' }],
        marks: [],
      }),
      model,
    });

    expect(gate).toMatchObject({ catalogId: 'radar', dialect: 'vega' });
    expect(gate.referenceExamples).toContain('Radar');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('uses the classifier for new visualizations', async () => {
    const { model } = mockModel({ catalogId: 'sunburst' });
    const gate = await resolveDialectGate({
      nlQuery: 'sunburst of categories',
      model,
    });

    expect(gate.dialect).toBe('vega');
    expect(gate.catalogId).toBe('sunburst');
    expect(gate.referenceExamples).toContain('stratify');
  });

  it('selects radar for new radar visualizations', async () => {
    const { model } = mockModel({ catalogId: 'radar' });
    const gate = await resolveDialectGate({
      nlQuery: 'radar chart of latency dimensions',
      model,
    });

    expect(gate.dialect).toBe('vega');
    expect(gate.catalogId).toBe('radar');
    expect(gate.referenceExamples).toContain('linear-closed');
  });

  it('pins Raw Vega sankey from an existing sankey spec without calling the classifier', async () => {
    const { model, invoke } = mockModel({ catalogId: 'none' });
    const gate = await resolveDialectGate({
      nlQuery: 'make it blue',
      existingSpec: JSON.stringify({
        $schema: VEGA_SCHEMA,
        data: [{ transform: [{ type: 'linkpath' }] }],
        marks: [],
      }),
      model,
    });

    expect(gate).toMatchObject({ catalogId: 'sankey', dialect: 'vega' });
    expect(gate.referenceExamples).toContain('linkpath');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('selects sankey for new sankey visualizations', async () => {
    const { model } = mockModel({ catalogId: 'sankey' });
    const gate = await resolveDialectGate({
      nlQuery: 'sankey of origin to destination countries',
      model,
    });

    expect(gate.dialect).toBe('vega');
    expect(gate.catalogId).toBe('sankey');
    expect(gate.referenceExamples).toContain('linkpath');
  });
});
