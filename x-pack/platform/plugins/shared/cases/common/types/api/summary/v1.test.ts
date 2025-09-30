/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { CaseSummaryRequestRt, CaseSummaryResponseRt } from './v1';

describe('Case summary', () => {
  describe('CaseSummaryRequestRt', () => {
    const defaultRequest = {
      connectorId: 'connector-id',
    };

    it('has expected attributes in request', () => {
      const query = CaseSummaryRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseSummaryRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CaseSummaryResponseRt', () => {
    const defaultResponse = {
      content: 'case summary',
      generatedAt: moment().toISOString(),
    };

    it('has expected attributes in response', () => {
      const query = CaseSummaryResponseRt.decode(defaultResponse);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultResponse,
      });
    });

    it('removes foo:bar attributes from response', () => {
      const query = CaseSummaryResponseRt.decode({ ...defaultResponse, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultResponse,
      });
    });
  });
});
