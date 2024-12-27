/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '..';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { experimentalFeaturesMock, registrationServicesMock } from '../../mocks';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';

const CONNECTOR_TYPE_ID = '.pagerduty';
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
    expect(connectorTypeModel.actionTypeTitle).toEqual('Send to PagerDuty');
  });
});

describe('pagerduty action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      component: 'test',
      group: 'group',
      class: 'test class',
      customDetails: '{}',
      links: [],
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        dedupKey: [],
        summary: [],
        timestamp: [],
        links: [],
        customDetails: [],
      },
    });
  });

  test('action params validation fails when the timestamp is invalid', async () => {
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: '2011-05-99T03:30-07',
      component: 'test',
      group: 'group',
      class: 'test class',
    };

    const expected = [expect.stringMatching(/^Timestamp must be a valid date/)];

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        dedupKey: [],
        summary: [],
        timestamp: expect.arrayContaining(expected),
        links: [],
        customDetails: [],
      },
    });
  });

  test('action params validation fails when customDetails are not valid JSON object', async () => {
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      component: 'test',
      group: 'group',
      class: 'test class',
      customDetails: '{foo:bar, "customFields": "{{contex.foo}}"}',
      links: [],
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        dedupKey: [],
        summary: [],
        timestamp: [],
        links: [],
        customDetails: ['Custom details must be a valid JSON object.'],
      },
    });
  });

  test('action params validation fails when customDetails are a valid JSON but not an object', async () => {
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      component: 'test',
      group: 'group',
      class: 'test class',
      customDetails: '1234',
      links: [],
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        dedupKey: [],
        summary: [],
        timestamp: [],
        links: [],
        customDetails: ['Custom details must be a valid JSON object.'],
      },
    });
  });

  test('action params validation fails when customDetails are an array of objects', async () => {
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      component: 'test',
      group: 'group',
      class: 'test class',
      customDetails: '[{"details": "Foo Bar"}, {"details": "{{alert.flapping}}"}]',
      links: [],
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        dedupKey: [],
        summary: [],
        timestamp: [],
        links: [],
        customDetails: ['Custom details must be a valid JSON object.'],
      },
    });
  });

  test('action params validation does not fail when customDetails are a valid JSON object', async () => {
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      component: 'test',
      group: 'group',
      class: 'test class',
      customDetails: '{"details": "{{alert.flapping}}"}',
      links: [],
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        dedupKey: [],
        summary: [],
        timestamp: [],
        links: [],
        customDetails: [],
      },
    });
  });

  test('action params validation fails when a link is missing the href field', async () => {
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      component: 'test',
      group: 'group',
      class: 'test class',
      customDetails: '{}',
      links: [{ href: '', text: 'foobar' }],
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        dedupKey: [],
        summary: [],
        timestamp: [],
        links: ['Link properties cannot be empty.'],
        customDetails: [],
      },
    });
  });

  test('action params validation fails when a link is missing the text field', async () => {
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      component: 'test',
      group: 'group',
      class: 'test class',
      customDetails: '{}',
      links: [{ href: 'foobar', text: '' }],
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        dedupKey: [],
        summary: [],
        timestamp: [],
        links: ['Link properties cannot be empty.'],
        customDetails: [],
      },
    });
  });

  test('action params validation does not throw the same error multiple times for links', async () => {
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      component: 'test',
      group: 'group',
      class: 'test class',
      customDetails: '{}',
      links: [
        { href: 'foobar', text: '' },
        { href: '', text: 'foobar' },
        { href: '', text: '' },
      ],
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        dedupKey: [],
        summary: [],
        timestamp: [],
        links: ['Link properties cannot be empty.'],
        customDetails: [],
      },
    });
  });
});
