/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockAnomalies } from '../mock';
import {
  createEntitiesFromScore,
  createEntity,
  createEntityFromRecord,
  createInfluencersFromScore,
} from './create_entities_from_score';
import { cloneDeep } from 'lodash/fp';

describe('create_entities_from_score', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('it returns expected entities from a typical score', () => {
    const entities = createEntitiesFromScore(anomalies.anomalies[0]);
    expect(entities).toEqual("host.name:'zeek-iowa',process.name:'du',user.name:'root'");
  });

  test('it returns expected non-duplicate entities', () => {
    const anomaly = anomalies.anomalies[0];
    anomaly.entityName = 'name-1';
    anomaly.entityValue = 'value-1';
    anomaly.influencers = [
      {
        'name-1': 'value-1',
      },
    ];
    const entities = createEntitiesFromScore(anomaly);
    expect(entities).toEqual("name-1:'value-1'");
  });

  test('it returns multiple entities', () => {
    const anomaly = anomalies.anomalies[0];
    anomaly.entityName = 'name-1';
    anomaly.entityValue = 'value-1';
    anomaly.influencers = [
      {
        'name-2': 'value-2',
      },
    ];
    const entities = createEntitiesFromScore(anomaly);
    expect(entities).toEqual("name-2:'value-2',name-1:'value-1'");
  });

  test('it returns just a single entity with an empty set of influencers', () => {
    const anomaly = anomalies.anomalies[0];
    anomaly.entityName = 'name-1';
    anomaly.entityValue = 'value-1';
    anomaly.influencers = [];
    const entities = createEntitiesFromScore(anomaly);
    expect(entities).toEqual("name-1:'value-1'");
  });

  test('it creates a simple string entity with quotes', () => {
    const entity = createEntity('name-1', 'value-1');
    expect(entity).toEqual("name-1:'value-1'");
  });

  test('it creates a simple string entity from a record<string, string>', () => {
    const entity = createEntityFromRecord({ 'name-1': 'value-1' });
    expect(entity).toEqual("name-1:'value-1'");
  });

  test('it returns expected entities from a typical score for influencers', () => {
    const influencers = createInfluencersFromScore(anomalies.anomalies[0].influencers);
    expect(influencers).toEqual("host.name:'zeek-iowa',process.name:'du',user.name:'root'");
  });

  test('it returns empty string for empty influencers', () => {
    const influencers = createInfluencersFromScore([]);
    expect(influencers).toEqual('');
  });

  test('it returns empty string for undefined influencers', () => {
    const influencers = createInfluencersFromScore();
    expect(influencers).toEqual('');
  });

  test('it returns single influencer', () => {
    const influencers = createInfluencersFromScore([{ 'influencer-1': 'value-1' }]);
    expect(influencers).toEqual("influencer-1:'value-1'");
  });

  test('it returns two influencers', () => {
    const influencers = createInfluencersFromScore([
      { 'influencer-1': 'value-1' },
      { 'influencer-2': 'value-2' },
    ]);
    expect(influencers).toEqual("influencer-1:'value-1',influencer-2:'value-2'");
  });

  test('it creates a simple string entity with undefined influencers', () => {
    const anomaly = anomalies.anomalies[0];
    anomaly.entityName = 'name-1';
    anomaly.entityValue = 'value-1';
    delete anomaly.influencers;
    const entities = createEntitiesFromScore(anomaly);
    expect(entities).toEqual("name-1:'value-1'");
  });
});
