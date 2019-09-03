/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { getRollupSearchStrategy } from './rollup_search_strategy';

describe('Rollup Search Strategy', () => {
  let RollupSearchStrategy;
  let RollupSearchRequest;
  let RollupSearchCapabilities;
  let callWithRequest;
  let rollupResolvedData;

  const server = 'server';
  const request = 'request';
  const indexPattern = 'indexPattern';

  beforeEach(() => {
    class AbstractSearchStrategy {
      getCallWithRequestInstance = jest.fn(() => callWithRequest);

      getFieldsForWildcard() {
        return [
          {
            name: 'day_of_week.terms.value',
            type: 'object',
            esTypes: ['object'],
            searchable: false,
            aggregatable: false,
          },
        ];
      }
    }

    RollupSearchRequest = jest.fn();
    RollupSearchCapabilities = jest.fn(() => 'capabilities');
    callWithRequest = jest.fn().mockImplementation(() => rollupResolvedData);

    RollupSearchStrategy = getRollupSearchStrategy(AbstractSearchStrategy, RollupSearchRequest, RollupSearchCapabilities);
  });

  test('should create instance of RollupSearchRequest', () => {
    const rollupSearchStrategy = new RollupSearchStrategy(server);

    expect(rollupSearchStrategy.name).toBe('rollup');
  });

  describe('checkForViability', () => {
    let rollupSearchStrategy;
    const rollupIndex = 'rollupIndex';

    beforeEach(() => {
      rollupSearchStrategy = new RollupSearchStrategy(server);
      rollupSearchStrategy.getRollupData = jest.fn(() => ({
        [rollupIndex]: {
          rollup_jobs: [{
            job_id: 'test',
            rollup_index: rollupIndex,
            index_pattern: 'kibana*',
            fields: {
              order_date: [{
                agg: 'date_histogram',
                delay: '1m',
                interval: '1m',
                time_zone: 'UTC',
              }],
              day_of_week: [{
                agg: 'terms',
              }],
            },
          }],
        },
      }));
    });

    test('isViable should be false for invalid index', async () => {
      const result = await rollupSearchStrategy.checkForViability(request, null);

      expect(result).toEqual({
        isViable: false,
        capabilities: null,
      });
    });

    test('should get RollupSearchCapabilities for valid rollup index ', async () => {
      await rollupSearchStrategy.checkForViability(request, rollupIndex);

      expect(RollupSearchCapabilities).toHaveBeenCalled();
    });
  });

  describe('getRollupData', () => {
    let rollupSearchStrategy;

    beforeEach(() => {
      rollupSearchStrategy = new RollupSearchStrategy(server);
    });

    test('should return rollup data', async () => {
      rollupResolvedData = Promise.resolve('data');

      const rollupData = await rollupSearchStrategy.getRollupData(request, indexPattern);

      expect(callWithRequest).toHaveBeenCalledWith('rollup.rollupIndexCapabilities', { indexPattern });
      expect(rollupSearchStrategy.getCallWithRequestInstance).toHaveBeenCalledWith(request);
      expect(rollupData).toBe('data');
    });

    test('should return empty object in case of exception', async () => {
      rollupResolvedData = Promise.reject('data');

      const rollupData = await rollupSearchStrategy.getRollupData(request, indexPattern);

      expect(rollupData).toEqual({});
    });
  });

  describe('getFieldsForWildcard', () => {
    let rollupSearchStrategy;
    let fieldsCapabilities;

    const rollupIndex = 'rollupIndex';

    beforeEach(() => {
      rollupSearchStrategy = new RollupSearchStrategy(server);
      fieldsCapabilities = {
        [rollupIndex]: {
          aggs: {
            terms: {
              day_of_week: { agg: 'terms' },
            },
          },
        },
      };
    });

    test('should return fields for wildcard', async () => {
      const fields = await rollupSearchStrategy.getFieldsForWildcard(request, indexPattern,
        { fieldsCapabilities, rollupIndex },
      );

      expect(fields).toEqual([
        {
          aggregatable: true,
          name: 'day_of_week',
          readFromDocValues: true,
          searchable: true,
          type: 'object',
          esTypes: ['object'],
        },
      ]);
    });
  });
});
