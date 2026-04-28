/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: (_id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
  },
}));

import { NO_DEFAULT_MODEL } from '../../../common/constants';
import {
  getGlobalModelComboOptions,
  getGlobalModelSelectedOptions,
} from './default_model_section_combo';

describe('default_model_section_combo', () => {
  const connectors = [
    { connectorId: 'pre-1', name: 'Elastic Model', isPreconfigured: true },
    { connectorId: 'custom-1', name: 'My Connector', isPreconfigured: false },
  ];

  describe('getGlobalModelComboOptions', () => {
    it('prepends Optional > No default model when feature-specific models include no-default choice', () => {
      const opts = getGlobalModelComboOptions(connectors, true);

      expect(opts[0]).toEqual(
        expect.objectContaining({
          label: 'Optional',
          value: 'optionalGlobalDefault',
          options: [
            expect.objectContaining({
              label: 'No default model',
              value: NO_DEFAULT_MODEL,
            }),
          ],
        })
      );
    });

    it('does not include the Optional group when no-default is not allowed', () => {
      const opts = getGlobalModelComboOptions(connectors, false);

      expect(opts.map((g) => g.label)).toEqual(['Pre-configured', 'Custom connectors']);
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
  });
});
