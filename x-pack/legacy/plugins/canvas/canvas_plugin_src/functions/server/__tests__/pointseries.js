/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { pointseries } from '../pointseries';
import { emptyTable, testTable } from '../../common/__tests__/fixtures/test_tables';

describe('pointseries', () => {
  const fn = pointseries().fn;

  describe('function', () => {
    it('empty datatable, null args', () => {
      expect(fn(emptyTable, { x: null, y: null })).to.be.eql({
        type: 'pointseries',
        columns: {},
        rows: [],
      });
    });
    it('empty datatable, invalid args', () => {
      expect(fn(emptyTable, { x: 'name', y: 'price' })).to.be.eql({
        type: 'pointseries',
        columns: {},
        rows: [],
      });
    });
    it('args with constants only', () => {
      expect(fn(testTable, { x: '1', y: '2' })).to.be.eql({
        type: 'pointseries',
        columns: {
          x: { type: 'number', role: 'measure', expression: '1' },
          y: { type: 'number', role: 'measure', expression: '2' },
        },
        rows: [{ x: 1, y: 2 }],
      });
    });
    it('args with dimensions only', () => {
      expect(fn(testTable, { x: 'name', y: 'price', size: 'quantity' })).to.be.eql({
        type: 'pointseries',
        columns: {
          x: {
            type: 'string',
            role: 'dimension',
            expression: 'name',
          },
          y: {
            type: 'number',
            role: 'dimension',
            expression: 'price',
          },
          size: {
            type: 'number',
            role: 'dimension',
            expression: 'quantity',
          },
        },
        rows: [
          { x: 'product1', y: 605, size: 100 },
          { x: 'product1', y: 583, size: 200 },
          { x: 'product1', y: 420, size: 300 },
          { x: 'product2', y: 216, size: 350 },
          { x: 'product2', y: 200, size: 256 },
          { x: 'product2', y: 190, size: 231 },
          { x: 'product3', y: 67, size: 240 },
          { x: 'product4', y: 311, size: 447 },
          { x: 'product5', y: 288, size: 384 },
        ],
      });
    });
    it('args including measures', () => {
      expect(fn(testTable, { x: 'name', y: 'mean(price)', size: 'mean(quantity)' })).to.be.eql({
        type: 'pointseries',
        columns: {
          x: {
            type: 'string',
            role: 'dimension',
            expression: 'name',
          },
          y: {
            type: 'number',
            role: 'measure',
            expression: 'mean(price)',
          },
          size: {
            type: 'number',
            role: 'measure',
            expression: 'mean(quantity)',
          },
        },
        rows: [
          { x: 'product1', y: 536, size: 200 },
          { x: 'product2', y: 202, size: 279 },
          { x: 'product3', y: 67, size: 240 },
          { x: 'product4', y: 311, size: 447 },
          { x: 'product5', y: 288, size: 384 },
        ],
      });
      expect(fn(testTable, { x: 'name', y: 'max(price * quantity + 2)' })).to.be.eql({
        type: 'pointseries',
        columns: {
          x: {
            type: 'string',
            role: 'dimension',
            expression: 'name',
          },
          y: {
            type: 'number',
            role: 'measure',
            expression: 'max(price * quantity + 2)',
          },
        },
        rows: [
          { x: 'product1', y: 126002 },
          { x: 'product2', y: 75602 },
          { x: 'product3', y: 16082 },
          { x: 'product4', y: 139019 },
          { x: 'product5', y: 110594 },
        ],
      });
      expect(fn(testTable, { x: 'name', y: 'count(price)' })).to.be.eql({
        type: 'pointseries',
        columns: {
          x: {
            type: 'string',
            role: 'dimension',
            expression: 'name',
          },
          y: {
            type: 'number',
            role: 'measure',
            expression: 'count(price)',
          },
        },
        rows: [
          { x: 'product1', y: 3 },
          { x: 'product2', y: 3 },
          { x: 'product3', y: 1 },
          { x: 'product4', y: 1 },
          { x: 'product5', y: 1 },
        ],
      });
      expect(fn(testTable, { x: 'unique(name)' })).to.be.eql({
        type: 'pointseries',
        columns: {
          x: {
            type: 'number',
            role: 'measure',
            expression: 'unique(name)',
          },
        },
        rows: [{ x: 5 }],
      });
    });
    it('args including random()', () => {
      const randomPointseries = fn(testTable, { x: 'time', y: 'random()' });
      expect(randomPointseries).to.have.property('type', 'pointseries');
      expect(randomPointseries.columns).to.be.eql({
        x: { type: 'date', role: 'dimension', expression: 'time' },
        y: {
          type: 'number',
          role: 'measure',
          expression: 'random()',
        },
      });
      randomPointseries.rows.map((row, i) => {
        expect(row.x).to.be(testTable.rows[i].time);
        expect(row.y).to.be.within(0, 1);
      });
    });
    it('empty string arg', () => {
      expect(fn(testTable, { x: 'name', y: 'max(time)', size: '    ', text: '' })).to.be.eql({
        type: 'pointseries',
        columns: {
          x: {
            type: 'string',
            role: 'dimension',
            expression: 'name',
          },
          y: {
            type: 'number',
            role: 'measure',
            expression: 'max(time)',
          },
        },
        rows: [
          { x: 'product1', y: 1518015600950 },
          { x: 'product2', y: 1518015600950 },
          { x: 'product3', y: 1517842800950 },
          { x: 'product4', y: 1517842800950 },
          { x: 'product5', y: 1517842800950 },
        ],
      });
    });
    it('ignores missing columns', () => {
      expect(fn(testTable, { x: 'name', y: 'notInTheTable' })).to.be.eql({
        type: 'pointseries',
        columns: {
          x: {
            type: 'string',
            role: 'dimension',
            expression: 'name',
          },
        },
        rows: [
          { x: 'product1' },
          { x: 'product2' },
          { x: 'product3' },
          { x: 'product4' },
          { x: 'product5' },
        ],
      });
      expect(fn(testTable, { y: 'notInTheTable' })).to.be.eql({
        type: 'pointseries',
        columns: {},
        rows: [{}],
      });
      expect(fn(testTable, { x: 'name', y: 'mean(notInTheTable)' })).to.be.eql({
        type: 'pointseries',
        columns: {
          x: {
            type: 'string',
            role: 'dimension',
            expression: 'name',
          },
          y: {
            type: 'number',
            role: 'measure',
            expression: 'mean(notInTheTable)',
          },
        },
        rows: [
          { x: 'product1', y: null },
          { x: 'product2', y: null },
          { x: 'product3', y: null },
          { x: 'product4', y: null },
          { x: 'product5', y: null },
        ],
      });
    });
    it('invalid args', () => {
      expect(fn(testTable, { x: 'name', y: 'quantity * 3' })).to.be.eql({
        type: 'pointseries',
        columns: {
          x: {
            type: 'string',
            role: 'dimension',
            expression: 'name',
          },
          y: {
            type: 'number',
            role: 'measure',
            expression: 'quantity * 3',
          },
        },
        rows: [
          { x: 'product1', y: null },
          { x: 'product2', y: null },
          { x: 'product3', y: null },
          { x: 'product4', y: null },
          { x: 'product5', y: null },
        ],
      });
      expect(fn(testTable, { x: 'time', y: 'sum(notInTheTable)' })).to.be.eql({
        type: 'pointseries',
        columns: {
          x: { type: 'date', role: 'dimension', expression: 'time' },
          y: {
            type: 'number',
            role: 'measure',
            expression: 'sum(notInTheTable)',
          },
        },
        rows: [
          { x: 1517842800950, y: null },
          { x: 1517929200950, y: null },
          { x: 1518015600950, y: null },
        ],
      });
    });
  });
});
