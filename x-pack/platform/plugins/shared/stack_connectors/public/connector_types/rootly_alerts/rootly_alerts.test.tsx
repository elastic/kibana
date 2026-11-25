/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { registerConnectorTypes } from '..';
import { experimentalFeaturesMock, registrationServicesMock } from '../../mocks';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';
import type { RootlyAlertsActionParams } from './types';

const CONNECTOR_TYPE_ID = '.rootly_alerts';
let connectorTypeModel: ConnectorTypeModel;

beforeAll(() => {
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  ExperimentalFeaturesService.init({ experimentalFeatures: experimentalFeaturesMock });
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(CONNECTOR_TYPE_ID);
  if (getResult !== null) {
    connectorTypeModel = getResult;
  }
});

describe('connectorTypeRegistry.get() works', () => {
  test('connector type static data is as expected', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_TYPE_ID);
    expect(connectorTypeModel.actionTypeTitle).toEqual('Send to Rootly Alerts');
  });

  test('default params are as expected', () => {
    expect(connectorTypeModel.defaultActionParams).toEqual({
      event: 'trigger',
      dedupKey: '{{rule.id}}:{{alert.id}}',
      title: '{{rule.name}}',
      description: '{{context.reason}}',
      url: '{{rule.url}}',
      match: { on: 'service', value: '{{context.serviceName}}' },
      ruleId: '{{rule.id}}',
      ruleName: '{{rule.name}}',
      alertId: '{{alert.id}}',
      space: '{{rule.spaceId}}',
      evaluationTime: '{{date}}',
    });
    expect(connectorTypeModel.defaultRecoveredActionParams).toEqual({
      event: 'resolve',
      dedupKey: '{{rule.id}}:{{alert.id}}',
    });
  });
});

describe('rootly alerts action params validation', () => {
  const noErrors = {
    dedupKey: [],
    title: [],
    match: [],
    target: [],
    labels: [],
    customDetails: [],
  };
  const validate = async (actionParams: RootlyAlertsActionParams) =>
    (await connectorTypeModel.validateParams(actionParams, null)).errors;

  test('action params validation succeeds when action params is valid', async () => {
    expect(
      await validate({
        event: 'trigger',
        dedupKey: 'rule:alert',
        title: 'Error count is high',
        urgency: 'High',
        match: { on: 'catalog', catalog: 'regions', value: 'eu-west' },
        labels: [{ key: 'environment', value: 'production' }],
        customDetails: '{"runbook":"https://example.com/runbook"}',
      })
    ).toEqual(noErrors);
  });

  test('action params validation succeeds for a trigger with only a title', async () => {
    expect(await validate({ event: 'trigger', title: 'Test alert' })).toEqual(noErrors);
    expect(await validate({ title: 'Test alert' })).toEqual(noErrors);
  });

  test('action params validation fails when a trigger has no title', async () => {
    expect(await validate({ event: 'trigger', title: ' ' })).toEqual({
      ...noErrors,
      title: ['Title is required.'],
    });
    expect(await validate({})).toEqual({ ...noErrors, title: ['Title is required.'] });
  });

  test('action params validation fails when a resolve has no dedupKey', async () => {
    expect(await validate({ event: 'resolve' })).toEqual({
      ...noErrors,
      dedupKey: ['Deduplication key is required.'],
    });
    expect(await validate({ event: 'resolve', dedupKey: 'rule:alert' })).toEqual(noErrors);
  });

  test('action params validation fails when a catalog value has no catalog slug', async () => {
    expect(
      await validate({ title: 'Test alert', match: { on: 'catalog', value: 'eu-west' } })
    ).toEqual({ ...noErrors, match: ['Catalog slug is required.'] });
  });

  test('action params validation fails when a target has no ID', async () => {
    expect(await validate({ title: 'Test alert', target: { type: 'service', id: ' ' } })).toEqual({
      ...noErrors,
      target: ['Rootly ID is required.'],
    });
    expect(
      await validate({ title: 'Test alert', target: { type: 'service', id: 'abc-123' } })
    ).toEqual(noErrors);
  });

  test('action params validation ignores the match when a target is set', async () => {
    expect(
      await validate({
        title: 'Test alert',
        match: { on: 'catalog', value: 'eu-west' },
        target: { type: 'team', id: 'abc-123' },
      })
    ).toEqual(noErrors);
  });

  test('action params validation fails when a static value is over the limit of the server', async () => {
    expect(
      await validate({ title: 'Test alert', target: { type: 'service', id: 'a'.repeat(513) } })
    ).toEqual({ ...noErrors, target: ['Rootly ID must be 512 characters or fewer.'] });
    expect(
      await validate({
        title: 'Test alert',
        match: { on: 'catalog', catalog: 'a'.repeat(1025), value: 'eu-west' },
      })
    ).toEqual({ ...noErrors, match: ['Catalog slug must be 1,024 characters or fewer.'] });
    expect(
      await validate({ title: 'Test alert', labels: [{ key: 'a'.repeat(1025), value: 'x' }] })
    ).toEqual({ ...noErrors, labels: ['Label names must be 1,024 characters or fewer.'] });
    expect(
      await validate({
        title: 'Test alert',
        labels: Array.from({ length: 101 }, (_, i) => ({ key: `label-${i}`, value: 'x' })),
      })
    ).toEqual({ ...noErrors, labels: ['Add no more than 100 labels.'] });
  });

  test('action params validation accepts static values at the limit of the server', async () => {
    expect(
      await validate({
        title: 'Test alert',
        match: { on: 'catalog', catalog: 'a'.repeat(1024), value: 'eu-west' },
        labels: Array.from({ length: 100 }, (_, i) => ({ key: `label-${i}`, value: 'x' })),
      })
    ).toEqual(noErrors);
    expect(
      await validate({ title: 'Test alert', target: { type: 'service', id: 'a'.repeat(512) } })
    ).toEqual(noErrors);
  });

  test('action params validation does not limit values rendered from rule variables', async () => {
    const long = 'a'.repeat(100000);
    expect(
      await validate({
        dedupKey: long,
        title: long,
        description: long,
        url: long,
        urgency: long,
        match: { on: 'service', value: long },
        labels: [{ key: 'environment', value: long }],
        customDetails: JSON.stringify({ details: long }),
      })
    ).toEqual(noErrors);
  });

  test('action params validation fails when a label has no name or a repeated name', async () => {
    expect(await validate({ title: 'Test alert', labels: [{ key: '', value: 'x' }] })).toEqual({
      ...noErrors,
      labels: ['Label name is required.'],
    });
    expect(
      await validate({
        title: 'Test alert',
        labels: [
          { key: 'env', value: 'a' },
          { key: 'env', value: 'b' },
        ],
      })
    ).toEqual({ ...noErrors, labels: ['Label names must be unique.'] });
  });

  test('action params validation fails when customDetails is not a JSON object', async () => {
    const error = 'Custom details must be a valid JSON object.';
    expect(await validate({ title: 'Test alert', customDetails: 'nope' })).toEqual({
      ...noErrors,
      customDetails: [error],
    });
    expect(await validate({ title: 'Test alert', customDetails: '[1,2]' })).toEqual({
      ...noErrors,
      customDetails: [error],
    });
  });
});
