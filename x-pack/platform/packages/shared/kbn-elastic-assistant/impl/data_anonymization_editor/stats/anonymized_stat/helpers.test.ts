/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getColor, getTooltipContent } from './helpers';

describe('helpers', () => {
  describe('getColor', () => {
    it('returns `default` when isDataAnonymizable is true', () => {
      const result = getColor(true);

      expect(result).toBe('default');
    });

    it('returns `subdued` when isDataAnonymizable is false', () => {
      const result = getColor(false);

      expect(result).toBe('subdued');
    });
  });

  describe('getTooltipContent', () => {
    it('informs the user that the context cannot be anonymized when isDataAnonymizable is false', () => {
      const result = getTooltipContent({ anonymized: 0, isDataAnonymizable: false });

      expect(result).toEqual('This context cannot be anonymized');
    });

    it('returns the expected message when the data is anonymizable, but no data has been anonymized', () => {
      const result = getTooltipContent({ anonymized: 0, isDataAnonymizable: true });
      expect(result).toEqual(
        'Select fields to be replaced with random values. Responses are automatically translated back to the original values.'
      );
    });

    it('returns the correct plural form of "field" when one field has been anonymized', () => {
      const result = getTooltipContent({ anonymized: 1, isDataAnonymizable: true });
      expect(result).toEqual(
        '1 field in this context will be replaced with random values. Responses are automatically translated back to the original values.'
      );
    });

    it('returns the correct plural form of "field" when more than one field has been anonymized', () => {
      const result = getTooltipContent({ anonymized: 2, isDataAnonymizable: true });
      expect(result).toEqual(
        '2 fields in this context will be replaced with random values. Responses are automatically translated back to the original values.'
      );
    });
  });
});
