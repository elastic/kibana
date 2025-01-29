/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertComment } from '../../../containers/mock';
import { getManualAlertIds } from './helpers';

const comment = {
  ...alertComment,
  alertId: 'alert-id-1',
  index: '.alerts-matchme.alerts',
};
const comment2 = {
  ...alertComment,
  alertId: 'alert-id-2',
  index: '.alerts-another.alerts',
};

const comment3 = {
  ...alertComment,
  alertId: ['nested1', 'nested2', 'nested3'],
};

describe('Case view helpers', () => {
  describe('getManualAlertIds', () => {
    it('returns the alert ids', () => {
      const result = getManualAlertIds([comment, comment2]);
      expect(result).toEqual(['alert-id-1', 'alert-id-2']);
    });

    it('returns the alerts id from multiple alerts in a comment', () => {
      const result = getManualAlertIds([comment, comment2, comment3]);
      expect(result).toEqual(['alert-id-1', 'alert-id-2', 'nested1', 'nested2', 'nested3']);
    });
  });
});
