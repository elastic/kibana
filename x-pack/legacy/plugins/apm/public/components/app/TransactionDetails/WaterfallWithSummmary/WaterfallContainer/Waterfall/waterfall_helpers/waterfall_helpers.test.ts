/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy } from 'lodash';
import { Span } from '../../../../../../../../typings/es_schemas/ui/Span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/Transaction';
import {
  getClockSkew,
  getOrderedWaterfallItems,
  getWaterfall,
  IWaterfallItem,
  IWaterfallTransaction,
  IWaterfallAgentMark
} from './waterfall_helpers';
import { APMError } from '../../../../../../../../typings/es_schemas/ui/APMError';

describe('waterfall_helpers', () => {
  describe('getWaterfall', () => {
    const hits = [
      {
        processor: { event: 'transaction' },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-node' },
        transaction: {
          duration: { us: 49660 },
          name: 'GET /api',
          id: 'myTransactionId1'
        },
        timestamp: { us: 1549324795784006 }
      } as Transaction,
      {
        parent: { id: 'mySpanIdA' },
        processor: { event: 'span' },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-ruby' },
        transaction: { id: 'myTransactionId2' },
        timestamp: { us: 1549324795825633 },
        span: {
          duration: { us: 481 },
          name: 'SELECT FROM products',
          id: 'mySpanIdB'
        }
      } as Span,
      {
        parent: { id: 'myTransactionId2' },
        processor: { event: 'span' },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-ruby' },
        transaction: { id: 'myTransactionId2' },
        span: {
          duration: { us: 6161 },
          name: 'Api::ProductsController#index',
          id: 'mySpanIdA'
        },
        timestamp: { us: 1549324795824504 }
      } as Span,
      {
        parent: { id: 'mySpanIdA' },
        processor: { event: 'span' },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-ruby' },
        transaction: { id: 'myTransactionId2' },
        span: {
          duration: { us: 532 },
          name: 'SELECT FROM product',
          id: 'mySpanIdC'
        },
        timestamp: { us: 1549324795827905 }
      } as Span,
      {
        parent: { id: 'myTransactionId1' },
        processor: { event: 'span' },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-node' },
        transaction: { id: 'myTransactionId1' },
        span: {
          duration: { us: 47557 },
          name: 'GET opbeans-ruby:3000/api/products',
          id: 'mySpanIdD'
        },
        timestamp: { us: 1549324795785760 }
      } as Span,
      ({
        parent: { id: 'mySpanIdD' },
        processor: { event: 'transaction' },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-ruby' },
        transaction: {
          duration: { us: 8634 },
          name: 'Api::ProductsController#index',
          id: 'myTransactionId2',
          marks: {
            agent: {
              domInteractive: 382,
              domComplete: 383,
              timeToFirstByte: 14
            }
          }
        },
        timestamp: { us: 1549324795823304 }
      } as unknown) as Transaction,
      ({
        processor: { event: 'error' },
        parent: { id: 'myTransactionId1' },
        timestamp: { us: 1549324795810000 },
        trace: { id: 'myTraceId' },
        transaction: { id: 'myTransactionId1' },
        error: {
          id: 'error1',
          grouping_key: 'errorGroupingKey1',
          log: {
            message: 'error message'
          }
        },
        service: { name: 'opbeans-ruby' },
        agent: {
          name: 'ruby',
          version: '2'
        }
      } as unknown) as APMError
    ];

    it('should return full waterfall', () => {
      const entryTransactionId = 'myTransactionId1';
      const errorsPerTransaction = {
        myTransactionId1: 2,
        myTransactionId2: 3
      };
      const waterfall = getWaterfall(
        {
          trace: { items: hits, exceedsMax: false },
          errorsPerTransaction
        },
        entryTransactionId
      );

      const agentMarks = waterfall.items.filter(
        item => item.docType === 'agentMark'
      );
      expect(waterfall.items.length).toBe(7);
      expect((waterfall.items[0] as IWaterfallTransaction).doc.id).toBe(
        'myTransactionId1'
      );
      expect(agentMarks.length).toEqual(0);
      expect(waterfall.errorsCount).toEqual(1);
      expect(waterfall).toMatchSnapshot();
    });

    it('should return partial waterfall', () => {
      const entryTransactionId = 'myTransactionId2';
      const errorsPerTransaction = {
        myTransactionId1: 2,
        myTransactionId2: 3
      };
      const waterfall = getWaterfall(
        {
          trace: { items: hits, exceedsMax: false },
          errorsPerTransaction
        },
        entryTransactionId
      );

      const agentMarks = waterfall.items.filter(
        item => item.docType === 'agentMark'
      );

      expect(waterfall.items.length).toBe(7);
      expect((waterfall.items[0] as IWaterfallTransaction).doc.id).toBe(
        'myTransactionId2'
      );
      expect(agentMarks.length).toEqual(3);
      expect(waterfall.errorsCount).toEqual(0);
      expect(waterfall).toMatchSnapshot();
    });
  });

  describe('getWaterfallItems', () => {
    it('should order items correctly', () => {
      const items: IWaterfallItem[] = [
        {
          docType: 'span',
          doc: {
            id: 'd',
            parentId: 'c',
            serviceName: 'opbeans-java',
            name: 'SELECT',
            timestamp: 1536763736371000,
            span: {
              transaction: {
                id: 'c'
              }
            } as Span
          },
          duration: 210,
          offset: 0,
          skew: 0
        },
        {
          docType: 'span',
          doc: {
            id: 'b',
            parentId: 'a',
            serviceName: 'opbeans-java',
            name: 'GET [0:0:0:0:0:0:0:1]',
            timestamp: 1536763736368000,
            span: {
              transaction: {
                id: 'a'
              }
            } as Span
          },
          duration: 4694,
          offset: 0,
          skew: 0
        },
        {
          docType: 'span',
          doc: {
            id: 'b2',
            parentId: 'a',
            serviceName: 'opbeans-java',
            name: 'GET [0:0:0:0:0:0:0:1]',
            timestamp: 1536763736367000,
            span: {
              transaction: {
                id: 'a'
              }
            } as Span
          },
          duration: 4694,
          offset: 0,
          skew: 0
        },
        {
          docType: 'transaction',
          doc: {
            id: 'c',
            parentId: 'b',
            serviceName: 'opbeans-java',
            name: 'APIRestController#productsRemote',
            timestamp: 1536763736369000,
            transaction: {} as Transaction,
            errorsCount: 0
          },
          duration: 3581,
          offset: 0,
          skew: 0
        },
        {
          docType: 'transaction',
          doc: {
            id: 'a',
            serviceName: 'opbeans-java',
            name: 'APIRestController#products',
            timestamp: 1536763736366000,
            transaction: {} as Transaction,
            errorsCount: 0
          },
          duration: 9480,
          offset: 0,
          skew: 0
        }
      ];

      const childrenByParentId = groupBy(
        items as Array<Exclude<IWaterfallItem, IWaterfallAgentMark>>,
        hit => (hit.doc.parentId ? hit.doc.parentId : 'root')
      );
      const entryTransactionItem = childrenByParentId
        .root[0] as IWaterfallTransaction;

      expect(
        getOrderedWaterfallItems(childrenByParentId, entryTransactionItem)
      ).toMatchSnapshot();
    });

    it('should handle cyclic references', () => {
      const items = [
        {
          docType: 'transaction',
          doc: { id: 'a', timestamp: 10 }
        } as IWaterfallItem,
        {
          docType: 'span',
          doc: { id: 'b', parentId: 'a', timestamp: 20 }
        } as IWaterfallItem
      ];
      const childrenByParentId = groupBy(items, hit =>
        hit.docType !== 'agentMark' && hit.doc.parentId
          ? hit.doc.parentId
          : 'root'
      );
      const entryTransactionItem = childrenByParentId
        .root[0] as IWaterfallTransaction;
      expect(
        getOrderedWaterfallItems(childrenByParentId, entryTransactionItem)
      ).toMatchSnapshot();
    });
  });

  describe('getClockSkew', () => {
    it('should adjust when child starts before parent', () => {
      const child = {
        docType: 'transaction',
        doc: {
          timestamp: 0
        },
        duration: 50
      } as IWaterfallItem;

      const parent = {
        docType: 'transaction',
        doc: {
          timestamp: 100
        },
        duration: 100,
        skew: 5
      } as IWaterfallItem;

      expect(getClockSkew(child, parent)).toBe(130);
    });

    it('should not adjust when child starts after parent has ended', () => {
      const child = {
        docType: 'transaction',
        doc: {
          timestamp: 250
        },
        duration: 50
      } as IWaterfallItem;

      const parent = {
        docType: 'transaction',
        doc: {
          timestamp: 100
        },
        duration: 100,
        skew: 5
      } as IWaterfallItem;

      expect(getClockSkew(child, parent)).toBe(0);
    });

    it('should not adjust when child starts within parent duration', () => {
      const child = {
        docType: 'transaction',
        doc: {
          timestamp: 150
        },
        duration: 50
      } as IWaterfallItem;

      const parent = {
        docType: 'transaction',
        doc: {
          timestamp: 100
        },
        duration: 100,
        skew: 5
      } as IWaterfallItem;

      expect(getClockSkew(child, parent)).toBe(0);
    });

    it('should return parent skew for spans', () => {
      const child = {
        docType: 'span'
      } as IWaterfallItem;

      const parent = {
        docType: 'span',
        doc: {
          timestamp: 100
        },
        duration: 100,
        skew: 5
      } as IWaterfallItem;

      expect(getClockSkew(child, parent)).toBe(5);
    });

    it('should not adjust when error starts within parent duration', () => {
      const child = {
        docType: 'error',
        doc: {
          timestamp: 200
        }
      } as IWaterfallItem;

      const parent = {
        docType: 'transaction',
        doc: {
          timestamp: 100
        },
        duration: 100,
        skew: 5
      } as IWaterfallItem;

      expect(getClockSkew(child, parent)).toBe(0);
    });

    it('should adjust when error starts before parent', () => {
      const child = {
        docType: 'error',
        doc: {
          timestamp: 10
        },
        duration: 0
      } as IWaterfallItem;

      const parent = {
        docType: 'transaction',
        doc: {
          timestamp: 100
        },
        duration: 100,
        skew: 5
      } as IWaterfallItem;

      expect(getClockSkew(child, parent)).toBe(145);
    });

    it('should handle missing parent', () => {
      const child = {
        docType: 'transaction'
      } as IWaterfallItem;

      const parent = undefined;

      expect(getClockSkew(child, parent)).toBe(0);
    });
  });
});
