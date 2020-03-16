/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { replaceVariablesInUrl } from '../helper';
import { Transaction } from '../../../../../../../../../plugins/apm/typings/es_schemas/ui/transaction';

describe('Custom link helper', () => {
  describe('replace variables in URL', () => {
    it('returns original url when no variable is found', () => {
      const url = 'https://www.elastic.co';
      expect(replaceVariablesInUrl(url, {} as Transaction)).toEqual(url);
    });
    it('replaces a single variable found', () => {
      const url = 'https://www.elastic.co?trace.id={{trace.id}}';
      expect(
        replaceVariablesInUrl(url, ({
          trace: { id: 123 }
        } as unknown) as Transaction)
      ).toEqual('https://www.elastic.co?trace.id=123');
    });
    it('replaces all variables found', () => {
      const url =
        'https://www.elastic.co?trace.id={{trace.id}}&service={{service.name}}&transation={{transaction.name}}&type={{transaction.type}}';
      expect(
        replaceVariablesInUrl(url, ({
          trace: { id: 123 },
          transaction: { name: 'transaction name', type: 'request' },
          service: { name: 'foo' }
        } as unknown) as Transaction)
      ).toEqual(
        'https://www.elastic.co?trace.id=123&service=foo&transation=transaction%20name&type=request'
      );
    });
    it('replaces to empty string when variable is not found on transaction', () => {
      const url = 'https://www.elastic.co?trace.id={{unknown.variable}}';
      expect(replaceVariablesInUrl(url, {} as Transaction)).toEqual(
        'https://www.elastic.co?trace.id='
      );
    });
  });
});
