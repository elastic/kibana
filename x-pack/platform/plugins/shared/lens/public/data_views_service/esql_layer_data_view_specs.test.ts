/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { TextBasedPersistedState } from '@kbn/lens-common';
import {
  withEsqlLayerDataViewSpecs,
  withoutEsqlLayerDataViewSpecs,
} from './esql_layer_data_view_specs';

type Layers = TextBasedPersistedState['layers'];

const createLayers = (layers: Record<string, unknown>): Layers => layers as Layers;

describe('withEsqlLayerDataViewSpecs', () => {
  it('derives the spec of an ES|QL layer from its query, index and time field', () => {
    const layers = createLayers({
      layer1: {
        index: 'esql-id',
        query: { esql: 'FROM logs-* | LIMIT 10' },
        timeField: '@timestamp',
      },
    });

    expect(withEsqlLayerDataViewSpecs(undefined, layers)).toEqual({
      'esql-id': { id: 'esql-id', title: 'logs-*', type: 'esql', timeFieldName: '@timestamp' },
    });
  });

  it('derives a spec without time field when the layer has none', () => {
    const layers = createLayers({
      layer1: { index: 'esql-id', query: { esql: 'FROM logs-*' } },
    });

    expect(withEsqlLayerDataViewSpecs({}, layers)['esql-id']).toEqual({
      id: 'esql-id',
      title: 'logs-*',
      type: 'esql',
      timeFieldName: undefined,
    });
  });

  it('keeps the persisted spec of a layer instead of deriving one', () => {
    const persisted: Record<string, DataViewSpec> = {
      'esql-id': {
        id: 'esql-id',
        title: 'persisted-*',
        type: 'esql',
        timeFieldName: 'event.ingested',
      },
    };
    const layers = createLayers({
      layer1: { index: 'esql-id', query: { esql: 'FROM logs-*' }, timeField: '@timestamp' },
    });

    expect(withEsqlLayerDataViewSpecs(persisted, layers)).toBe(persisted);
  });

  it('keeps the other persisted specs next to the derived ones', () => {
    const persisted: Record<string, DataViewSpec> = {
      other: { id: 'other', title: 'other-*' },
    };
    const layers = createLayers({
      layer1: { index: 'esql-id', query: { esql: 'FROM logs-*' } },
    });

    expect(Object.keys(withEsqlLayerDataViewSpecs(persisted, layers))).toEqual([
      'other',
      'esql-id',
    ]);
  });

  it('derives one spec for layers sharing the same dataset', () => {
    const layers = createLayers({
      layer1: { index: 'esql-id', query: { esql: 'FROM logs-*' } },
      layer2: { index: 'esql-id', query: { esql: 'FROM logs-* | LIMIT 5' }, timeField: 'ts' },
    });

    expect(Object.keys(withEsqlLayerDataViewSpecs({}, layers))).toEqual(['esql-id']);
  });

  it('does not derive a spec for a layer pointing to a saved data view', () => {
    const layers = createLayers({
      layer1: { index: 'saved-dv', query: { esql: 'FROM logs-*' } },
    });

    expect(
      withEsqlLayerDataViewSpecs({}, layers, [
        {
          type: 'index-pattern',
          id: 'saved-dv',
          name: 'textBasedLanguages-datasource-layer-layer1',
        },
      ])
    ).toEqual({});
  });

  it.each([
    ['without index', { query: { esql: 'FROM logs-*' } }],
    ['without query', { index: 'esql-id' }],
    ['with a non ES|QL query', { index: 'esql-id', query: { language: 'kuery', query: '' } }],
  ])('does not derive a spec for a layer %s', (_name, layer) => {
    expect(withEsqlLayerDataViewSpecs({}, createLayers({ layer1: layer }))).toEqual({});
  });

  it('returns the persisted specs when there are no layers', () => {
    const persisted = { other: { id: 'other', title: 'other-*' } };

    expect(withEsqlLayerDataViewSpecs(persisted, undefined)).toBe(persisted);
    expect(withEsqlLayerDataViewSpecs(undefined, undefined)).toEqual({});
  });
});

describe('withoutEsqlLayerDataViewSpecs', () => {
  const layers = createLayers({
    layer1: { index: 'esql-id', query: { esql: 'FROM logs-*' }, timeField: '@timestamp' },
  });
  const spec: DataViewSpec = {
    id: 'esql-id',
    title: 'logs-*',
    type: 'esql',
    timeFieldName: '@timestamp',
  };
  const layerReference = { type: 'index-pattern', id: 'esql-id', name: 'layer-reference' };

  it('drops the spec of an ES|QL layer', () => {
    expect(withoutEsqlLayerDataViewSpecs({ 'esql-id': spec }, layers, [layerReference])).toEqual(
      {}
    );
  });

  it('keeps the specs that are not the dataset of an ES|QL layer', () => {
    const other: DataViewSpec = { id: 'other', title: 'other-*' };

    expect(
      withoutEsqlLayerDataViewSpecs({ 'esql-id': spec, other }, layers, [layerReference])
    ).toEqual({ other });
  });

  it('keeps the spec when another layer or visualization points to the same id', () => {
    const adHoc = { 'esql-id': spec };
    const referenceLineReference = { ...layerReference, name: 'reference-line-reference' };

    expect(
      withoutEsqlLayerDataViewSpecs(adHoc, layers, [layerReference, referenceLineReference])
    ).toEqual(adHoc);
  });

  it('drops the spec of every ES|QL layer sharing the dataset when nothing else uses it', () => {
    const sharedLayers = createLayers({
      layer1: { index: 'esql-id', query: { esql: 'FROM logs-*' } },
      layer2: { index: 'esql-id', query: { esql: 'FROM logs-*' } },
    });

    expect(
      withoutEsqlLayerDataViewSpecs({ 'esql-id': spec }, sharedLayers, [
        layerReference,
        { ...layerReference, name: 'layer2-reference' },
      ])
    ).toEqual({});
  });

  it('keeps a spec that is not of type ES|QL, like a saved data view reused by a layer', () => {
    const adHoc = { 'esql-id': { ...spec, type: undefined } };

    expect(withoutEsqlLayerDataViewSpecs(adHoc, layers, [layerReference])).toEqual(adHoc);
  });

  it('keeps every spec when there are no ES|QL layers', () => {
    const adHoc = { 'esql-id': spec };

    expect(withoutEsqlLayerDataViewSpecs(adHoc, undefined, [])).toBe(adHoc);
  });
});
