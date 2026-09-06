/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  customContentStateSchema,
} from '@kbn/custom-content-common';
import {
  customContentPanelConfigSchema,
  customContentPanelDefinition,
  editCustomContentPanelConfigInputSchema,
} from '.';

/**
 * Drift guard: `customContentPanelConfigSchema` is derived from `customContentStateSchema`
 * (via `.extend()`), so any value it accepts must also be accepted by the embeddable state
 * schema. This verifies the derivation is wired correctly and documents the intent: values
 * the agent writes must be storable as embeddable state without a round-trip.
 */
describe('customContentPanelConfigSchema parity with the embeddable state schema', () => {
  it.each([
    { prompt: 'Show total error count as a large KPI number' },
    { prompt: 'Status board' },
    {
      prompt: 'Error rate by service',
      esqlQuery: 'FROM logs-* | STATS count = COUNT(*) BY service.name',
    },
  ])('produces embeddable-valid state for %j', (input) => {
    const parsed = customContentPanelConfigSchema.parse(input);

    expect(() => customContentStateSchema.parse(parsed)).not.toThrow();
  });

  it('strips template on create (template not accepted in create schema)', () => {
    const result = customContentPanelConfigSchema.safeParse({
      prompt: 'Show KPI',
      template: '<div>html</div>',
    });

    expect(result.success).toBe(true);
    expect((result.data as Record<string, unknown>).template).toBeUndefined();
  });
});

describe('customContentPanelDefinition', () => {
  describe('buildPanelContent', () => {
    it('maps the config to the custom_content embeddable type', () => {
      const config = {
        prompt: 'Show error rate',
        esqlQuery: 'FROM logs-* | STATS error_rate = AVG(error) BY host',
      };

      expect(customContentPanelDefinition.buildPanelContent(config)).toEqual({
        type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        config,
      });
    });

    it('passes through a prompt-only config unchanged', () => {
      const config = { prompt: 'Show a summary of the system health' };

      expect(customContentPanelDefinition.buildPanelContent(config)).toEqual({
        type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        config,
      });
    });
  });

  describe('editCustomContentPanelConfigInputSchema', () => {
    it('accepts a prompt-only edit (server regenerates template)', () => {
      expect(
        editCustomContentPanelConfigInputSchema.safeParse({
          source: 'config',
          type: 'custom_content',
          panelId: 'cc-1',
          config: { prompt: 'Updated KPI' },
        }).success
      ).toBe(true);
    });

    it('accepts an esqlQuery-only edit (keeps existing prompt, server regenerates template)', () => {
      expect(
        editCustomContentPanelConfigInputSchema.safeParse({
          source: 'config',
          type: 'custom_content',
          panelId: 'cc-1',
          config: { esqlQuery: 'FROM logs-* | STATS count = COUNT(*)' },
        }).success
      ).toBe(true);
    });

    it('accepts empty config (server regenerates template from existing merged values)', () => {
      expect(
        editCustomContentPanelConfigInputSchema.safeParse({
          source: 'config',
          type: 'custom_content',
          panelId: 'cc-1',
          config: {},
        }).success
      ).toBe(true);
    });

    it('rejects when panelId is missing', () => {
      expect(
        editCustomContentPanelConfigInputSchema.safeParse({
          source: 'config',
          type: 'custom_content',
          config: { prompt: 'Updated KPI' },
        }).success
      ).toBe(false);
    });

    it('strips unknown fields from config (template is server-generated, not user-supplied)', () => {
      const result = editCustomContentPanelConfigInputSchema.safeParse({
        source: 'config',
        type: 'custom_content',
        panelId: 'cc-1',
        config: { prompt: 'Updated KPI', template: '<div>{{ row["value"].value }}</div>' },
      });

      expect(result.success).toBe(true);
      expect((result.data?.config as Record<string, unknown>).template).toBeUndefined();
    });
  });

  describe('validateConfigEdit', () => {
    it('accepts editing a custom_content panel', () => {
      expect(
        customContentPanelDefinition.validateConfigEdit?.({
          id: 'panel-1',
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: { prompt: 'old prompt' },
          grid: { x: 0, y: 0, w: 12, h: 5 },
        })
      ).toEqual({ ok: true });
    });

    it('rejects editing a non-custom_content panel', () => {
      const result = customContentPanelDefinition.validateConfigEdit?.({
        id: 'panel-1',
        type: 'lens',
        config: {},
        grid: { x: 0, y: 0, w: 12, h: 5 },
      });

      expect(result?.ok).toBe(false);
      expect((result as { ok: false; error: string })?.error).toMatch(/panel-1.*lens/);
    });
  });
});
