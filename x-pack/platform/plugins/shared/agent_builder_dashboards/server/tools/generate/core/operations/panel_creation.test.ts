/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_CONTENT_EMBEDDABLE_TYPE, readEsqlQuery } from '@kbn/custom-content-common';
import type { MaterializedPanelInput } from './panel_creation';
import { applyCustomContentTemplates, mergeAndResolveCustomContentEdit } from './panel_creation';

const makeCustomContentPanel = (config: Record<string, unknown>): MaterializedPanelInput => ({
  panelContent: { type: CUSTOM_CONTENT_EMBEDDABLE_TYPE, config },
});

const makeLensPanel = (): MaterializedPanelInput => ({
  panelContent: { type: 'lens', config: {} },
});

describe('applyCustomContentTemplates', () => {
  it('calls resolveTemplate for panels that have a prompt but no template', async () => {
    const resolveTemplate = jest
      .fn()
      .mockResolvedValue({ template: '<div>generated</div>', height: 320 });
    const panel = makeCustomContentPanel({ prompt: 'Show KPI' });
    const materialized = [{ panel }];

    await applyCustomContentTemplates(materialized, resolveTemplate, []);

    expect(resolveTemplate).toHaveBeenCalledTimes(1);
    expect(resolveTemplate).toHaveBeenCalledWith({ prompt: 'Show KPI', esqlQuery: undefined });
    expect((panel.panelContent.config as Record<string, unknown>).template).toBe(
      '<div>generated</div>'
    );
  });

  it('passes esqlQuery through to resolveTemplate when present', async () => {
    const resolveTemplate = jest
      .fn()
      .mockResolvedValue({ template: '<div>chart</div>', height: 320 });
    const panel = makeCustomContentPanel({
      prompt: 'Bar chart',
      esqlQuery: 'FROM logs-* | STATS count = COUNT(*)',
    });

    await applyCustomContentTemplates([{ panel }], resolveTemplate, []);

    expect(resolveTemplate).toHaveBeenCalledWith({
      prompt: 'Bar chart',
      esqlQuery: 'FROM logs-* | STATS count = COUNT(*)',
    });
  });

  it('skips panels that already have a template', async () => {
    const resolveTemplate = jest.fn();
    const panel = makeCustomContentPanel({ prompt: 'Show KPI', template: '<div>existing</div>' });

    await applyCustomContentTemplates([{ panel }], resolveTemplate, []);

    expect(resolveTemplate).not.toHaveBeenCalled();
  });

  it('skips non-custom_content panels', async () => {
    const resolveTemplate = jest.fn();
    const panel = makeLensPanel();

    await applyCustomContentTemplates([{ panel }], resolveTemplate, []);

    expect(resolveTemplate).not.toHaveBeenCalled();
  });

  it('skips undefined panel entries', async () => {
    const resolveTemplate = jest.fn();

    await applyCustomContentTemplates([{ panel: undefined }], resolveTemplate, []);

    expect(resolveTemplate).not.toHaveBeenCalled();
  });

  it('resolves multiple panels in parallel and writes each template back', async () => {
    const resolveTemplate = jest
      .fn()
      .mockResolvedValueOnce({ template: '<div>first</div>', height: 320 })
      .mockResolvedValueOnce({ template: '<div>second</div>', height: 320 });

    const panel1 = makeCustomContentPanel({ prompt: 'First' });
    const panel2 = makeCustomContentPanel({ prompt: 'Second' });

    await applyCustomContentTemplates([{ panel: panel1 }, { panel: panel2 }], resolveTemplate, []);

    expect(resolveTemplate).toHaveBeenCalledTimes(2);
    expect((panel1.panelContent.config as Record<string, unknown>).template).toBe(
      '<div>first</div>'
    );
    expect((panel2.panelContent.config as Record<string, unknown>).template).toBe(
      '<div>second</div>'
    );
  });

  it('records a per-panel failure and nulls the entry when resolveTemplate throws, leaving other panels intact', async () => {
    const resolveTemplate = jest
      .fn()
      .mockRejectedValueOnce(new Error('Generated template was rejected: contains a <script> tag.'))
      .mockResolvedValueOnce({ template: '<div>second</div>', height: 320 });

    const entry1 = { panel: makeCustomContentPanel({ prompt: 'First' }) };
    const entry2 = { panel: makeCustomContentPanel({ prompt: 'Second' }) };
    const failures: Array<{ type: string; identifier: string; error: string }> = [];

    await applyCustomContentTemplates([entry1, entry2], resolveTemplate, failures as any);

    expect(entry1.panel).toBeUndefined();
    expect((entry2.panel!.panelContent.config as Record<string, unknown>).template).toBe(
      '<div>second</div>'
    );
    expect(failures).toHaveLength(1);
    expect(failures[0].identifier).toBe('First');
    expect(failures[0].error).toContain('<script>');
  });
});

describe('mergeAndResolveCustomContentEdit', () => {
  const resolveTemplate = jest
    .fn()
    .mockResolvedValue({ template: '<div>resolved</div>', height: 320 });

  beforeEach(() => {
    resolveTemplate.mockClear();
  });

  it('uses editConfig.prompt when provided', async () => {
    await mergeAndResolveCustomContentEdit({ prompt: 'New prompt' }, {}, resolveTemplate);

    expect(resolveTemplate).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'New prompt' }));
  });

  it('resolves from the existing template when the edit carries no prompt', async () => {
    const result = await mergeAndResolveCustomContentEdit(
      { esqlQuery: 'FROM metrics-*' },
      { template: '<div>old</div>' },
      resolveTemplate
    );

    expect(resolveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: '', existingTemplate: '<div>old</div>' })
    );
    expect(result).not.toHaveProperty('prompt');
  });

  it('keeps the existing esqlQuery in the result without re-sampling it', async () => {
    const result = await mergeAndResolveCustomContentEdit(
      { prompt: 'Updated' },
      { esql_query: ['FROM logs-*'] },
      resolveTemplate
    );

    expect(resolveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ esqlQuery: undefined, hasExistingQuery: true })
    );
    expect(readEsqlQuery(result)).toBe('FROM logs-*');
  });

  it('clears esqlQuery when editConfig.esqlQuery is null', async () => {
    await mergeAndResolveCustomContentEdit(
      { esqlQuery: null },
      { esql_query: ['FROM logs-*'] },
      resolveTemplate
    );

    expect(resolveTemplate).toHaveBeenCalledWith(expect.objectContaining({ esqlQuery: undefined }));
  });

  it('uses the new esqlQuery and samples it when editConfig.esqlQuery is a string', async () => {
    await mergeAndResolveCustomContentEdit(
      { esqlQuery: 'FROM metrics-*' },
      { esql_query: ['FROM logs-*'] },
      resolveTemplate
    );

    expect(resolveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ esqlQuery: 'FROM metrics-*', hasExistingQuery: false })
    );
  });

  it('passes existingTemplate through to resolveTemplate', async () => {
    await mergeAndResolveCustomContentEdit(
      { prompt: 'Updated' },
      { template: '<div>old template</div>' },
      resolveTemplate
    );

    expect(resolveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ existingTemplate: '<div>old template</div>' })
    );
  });

  it('returns the merged state with the resolved template', async () => {
    const result = await mergeAndResolveCustomContentEdit(
      { prompt: 'New prompt', esqlQuery: 'FROM logs-*' },
      {},
      resolveTemplate
    );

    expect(result).toEqual({
      esql_query: ['FROM logs-*'],
      template: '<div>resolved</div>',
    });
  });
});
