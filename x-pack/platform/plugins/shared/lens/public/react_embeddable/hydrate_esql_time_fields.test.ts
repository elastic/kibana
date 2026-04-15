/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import * as esqlUtils from '@kbn/esql-utils';
import type { LensRuntimeState, TextBasedPersistedState } from '@kbn/lens-common';

// Barrel re-exports are non-configurable; wrapping the module makes spyOn work.
jest.mock('@kbn/esql-utils', () => ({
  __esModule: true,
  ...jest.requireActual('@kbn/esql-utils'),
}));
import { LENS_ITEM_LATEST_VERSION } from '@kbn/lens-common/content_management/constants';
import expect from 'expect';
import { hydrateESQLTimeFields } from './hydrate_esql_time_fields';

describe('hydrateESQLTimeFields', () => {
  const http = coreMock.createStart().http;
  const textBasedEsqlAttributes: LensRuntimeState['attributes'] = {
    version: LENS_ITEM_LATEST_VERSION,
    title: '',
    description: '',
    visualizationType: 'lnsXY',
    references: [],
    state: {
      query: { query: '', language: 'kuery' },
      filters: [],
      internalReferences: [],
      datasourceStates: {
        textBased: {
          layers: {
            layer1: {
              query: { esql: 'FROM logs-* | LIMIT 10' },
              columns: [],
            },
          },
        },
      },
      visualization: {},
    },
  };
  it('returns input attributes when time-field resolution throws', async () => {
    const spy = jest
      .spyOn(esqlUtils, 'getESQLTimeFieldFromQuery')
      .mockRejectedValue(new Error('network'));
    const result = await hydrateESQLTimeFields(textBasedEsqlAttributes, http);
    expect(result).toBe(textBasedEsqlAttributes);
    spy.mockRestore();
  });

  it('does not mark TBUCKET on a non-time field as date type', async () => {
    const attrs: LensRuntimeState['attributes'] = {
      version: LENS_ITEM_LATEST_VERSION,
      title: '',
      description: '',
      visualizationType: 'lnsXY',
      references: [],
      state: {
        query: { query: '', language: 'kuery' },
        filters: [],
        internalReferences: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer1: {
                query: {
                  esql: 'FROM logs-* | STATS count() BY ts = TBUCKET(other_date_field, 1 day)',
                },
                timeField: '@timestamp',
                columns: [
                  { columnId: 'c1', fieldName: 'count()', meta: { type: 'number' } },
                  { columnId: 'c2', fieldName: 'ts', meta: { type: 'string' } },
                ],
              },
            },
          },
        },
        visualization: {},
      },
    };
    const result = await hydrateESQLTimeFields(attrs, http);
    const { layers } = result.state.datasourceStates?.textBased as TextBasedPersistedState;
    expect(layers.layer1.columns[1].meta?.type).toBe('string');
  });

  it('marks TBUCKET on the time field as date type', async () => {
    const attrs: LensRuntimeState['attributes'] = {
      version: LENS_ITEM_LATEST_VERSION,
      title: '',
      description: '',
      visualizationType: 'lnsXY',
      references: [],
      state: {
        query: { query: '', language: 'kuery' },
        filters: [],
        internalReferences: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer1: {
                query: {
                  esql: 'FROM logs-* | STATS count() BY ts = TBUCKET(@timestamp, 1 day)',
                },
                timeField: '@timestamp',
                columns: [
                  { columnId: 'c1', fieldName: 'count()', meta: { type: 'number' } },
                  { columnId: 'c2', fieldName: 'ts', meta: { type: 'string' } },
                ],
              },
            },
          },
        },
        visualization: {},
      },
    };
    const result = await hydrateESQLTimeFields(attrs, http);
    const { layers } = result.state.datasourceStates?.textBased as TextBasedPersistedState;
    expect(layers.layer1.columns[1].meta?.type).toBe('date');
  });

  it('marks renamed direct time-field references as date type', async () => {
    const attrs: LensRuntimeState['attributes'] = {
      version: LENS_ITEM_LATEST_VERSION,
      title: '',
      description: '',
      visualizationType: 'lnsXY',
      references: [],
      state: {
        query: { query: '', language: 'kuery' },
        filters: [],
        internalReferences: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer1: {
                query: { esql: 'FROM logs-* | STATS count() BY ts = @timestamp' },
                timeField: '@timestamp',
                columns: [
                  { columnId: 'c1', fieldName: 'count()', meta: { type: 'number' } },
                  { columnId: 'c2', fieldName: 'ts', meta: { type: 'string' } },
                ],
              },
            },
          },
        },
        visualization: {},
      },
    };
    const result = await hydrateESQLTimeFields(attrs, http);
    const { layers } = result.state.datasourceStates?.textBased as TextBasedPersistedState;
    expect(layers.layer1.columns[1].meta?.type).toBe('date');
    expect(layers.layer1.columns[0].meta?.type).toBe('number');
  });
});
