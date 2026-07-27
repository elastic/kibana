/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: (
      _id: string,
      {
        defaultMessage,
        values,
      }: { defaultMessage: string; values?: Record<string, string | number> }
    ) => {
      if (!values) return defaultMessage;
      return Object.entries(values).reduce(
        (msg, [key, value]) => msg.replace(`{${key}}`, String(value)),
        defaultMessage
      );
    },
  },
}));

import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import { NO_DEFAULT_MODEL } from '../../../common/constants';
import {
  connectorToGlobalModelComboOption,
  getGlobalModelComboOptions,
  getGlobalModelSelectedOptions,
} from './default_model_section_combo';

const baseMockConnector: Pick<
  InferenceConnector,
  'type' | 'config' | 'capabilities' | 'isInferenceEndpoint'
> = {
  type: InferenceConnectorType.Inference,
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
};

describe('default_model_section_combo', () => {
  const connectors: InferenceConnector[] = [
    {
      ...baseMockConnector,
      connectorId: 'pre-1',
      name: 'Elastic Model',
      isPreconfigured: true,
    },
    {
      ...baseMockConnector,
      connectorId: 'custom-1',
      name: 'My Connector',
      isPreconfigured: false,
    },
  ];

  describe('getGlobalModelComboOptions', () => {
    it('prepends a standalone No default model option when feature-specific models include it', () => {
      const opts = getGlobalModelComboOptions(connectors, true);

      expect(opts[0]).toEqual(
        expect.objectContaining({
          label: 'No default model',
          value: NO_DEFAULT_MODEL,
        })
      );
      expect(opts[1]?.label).toBe('Pre-configured');
    });

    it('does not include No default model when no-default is not allowed', () => {
      const opts = getGlobalModelComboOptions(connectors, false);

      expect(opts.map((g) => g.label)).toEqual(['Pre-configured', 'Custom models']);
    });
  });

  describe('getGlobalModelSelectedOptions', () => {
    const optsWithNoDefault = getGlobalModelComboOptions(connectors, true);

    it('returns the synthetic No default option when selected and allowed', () => {
      expect(getGlobalModelSelectedOptions(NO_DEFAULT_MODEL, optsWithNoDefault, true)).toEqual([
        expect.objectContaining({ label: 'No default model', value: NO_DEFAULT_MODEL }),
      ]);
    });

    it('returns empty selection when NO_DEFAULT_MODEL but no-default is not allowed', () => {
      const opts = getGlobalModelComboOptions(connectors, false);

      expect(getGlobalModelSelectedOptions(NO_DEFAULT_MODEL, opts, false)).toEqual([]);
    });

    it('resolves a connector id to its leaf option', () => {
      expect(getGlobalModelSelectedOptions('pre-1', optsWithNoDefault, true)).toEqual([
        expect.objectContaining({ label: 'Elastic Model', value: 'pre-1' }),
      ]);
    });

    it('returns empty array when the value does not match any option', () => {
      const opts = getGlobalModelComboOptions(connectors, true);
      expect(getGlobalModelSelectedOptions('nonexistent-id', opts, true)).toEqual([]);
    });
  });

  describe('connectorToGlobalModelComboOption', () => {
    const baseConnector: InferenceConnector = {
      ...baseMockConnector,
      connectorId: 'ep-1',
      name: 'My Model',
      isPreconfigured: true,
    };

    it('returns the plain connector name when metadata is undefined', () => {
      const option = connectorToGlobalModelComboOption(baseConnector);
      expect(option).toEqual({ label: 'My Model', value: 'ep-1' });
    });

    it('returns the plain connector name for a GA model', () => {
      const option = connectorToGlobalModelComboOption({
        ...baseConnector,
        metadata: { heuristics: { status: 'ga' } },
      });
      expect(option.label).toBe('My Model');
    });

    it('appends " - Deprecated" when the model is deprecated but not yet EOL', () => {
      const option = connectorToGlobalModelComboOption({
        ...baseConnector,
        metadata: {
          heuristics: { status: 'deprecated', end_of_life_date: '2099-01-01' },
        },
      });
      expect(option.label).toBe('My Model - Deprecated');
    });

    it('appends " - End of Life" when the EOL date is in the past', () => {
      const option = connectorToGlobalModelComboOption({
        ...baseConnector,
        metadata: {
          heuristics: { status: 'deprecated', end_of_life_date: '2020-01-01' },
        },
      });
      expect(option.label).toBe('My Model - End of Life');
    });
  });
});
