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
import { CONNECTOR_ID } from '@kbn/connector-schemas/slack_api/constants';

let connectorTypeModel: ConnectorTypeModel;
const testBlock = {
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "Hello, Assistant to the Regional Manager Dwight! *Michael Scott* wants to know where you'd like to take the Paper Company investors to dinner tonight.\n",
      },
    },
  ],
};

beforeAll(async () => {
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  ExperimentalFeaturesService.init({ experimentalFeatures: experimentalFeaturesMock });
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(CONNECTOR_ID);
  if (getResult !== null) {
    connectorTypeModel = getResult;
  }
});

describe('connectorTypeRegistry.get works', () => {
  it('connector type static data is as expected', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_ID);
    expect(connectorTypeModel.iconClass).toEqual('logoSlack');
  });
});

describe('hideInUi', () => {
  it('should return true when slack is enabled in config', () => {
    expect(
      // @ts-expect-error
      connectorTypeModel.getHideInUi([
        // @ts-expect-error necessary fields only
        { id: '.slack', enabledInConfig: true, enabledInLicense: true, name: 'Slack' },
      ])
    ).toEqual(true);
  });

  it('should return false when slack is disabled in config', () => {
    expect(
      // @ts-expect-error
      connectorTypeModel.getHideInUi([
        // @ts-expect-error necessary fields only
        { id: '.slack', enabledInConfig: false, enabledInLicense: true, name: 'Slack' },
      ])
    ).toEqual(false);
  });

  it('should return false when slack is not found in config', () => {
    expect(
      // @ts-expect-error
      connectorTypeModel.getHideInUi([
        // @ts-expect-error necessary fields only
        { id: '.cases', enabledInConfig: true, enabledInLicense: true, name: 'Cases' },
      ])
    ).toEqual(false);
  });
});

describe('Slack action params validation', () => {
  describe('postMessage', () => {
    it('should succeed when action params include valid message and channels list', async () => {
      const actionParams = {
        subAction: 'postMessage',
        subActionParams: { channels: ['general'], text: 'some text' },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: [],
          channels: [],
        },
      });
    });

    it('should succeed when action params include valid message and channels and channel ids', async () => {
      const actionParams = {
        subAction: 'postMessage',
        subActionParams: { channels: ['general'], channelIds: ['general'], text: 'some text' },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: [],
          channels: [],
        },
      });
    });

    it('should fail when channels field is missing in action params', async () => {
      const actionParams = {
        subAction: 'postMessage',
        subActionParams: { text: 'some text' },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: [],
          channels: ['Channel ID is required.'],
        },
      });
    });

    it('should fail when field text does not exist', async () => {
      const actionParams = {
        subAction: 'postMessage',
        subActionParams: { channels: ['general'] },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: ['Message is required.'],
          channels: [],
        },
      });
    });

    it('should fail when text is empty string', async () => {
      const actionParams = {
        subAction: 'postMessage',
        subActionParams: { channels: ['general'], text: '' },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: ['Message is required.'],
          channels: [],
        },
      });
    });
  });

  describe('postBlockkit', () => {
    it('should succeed when action params include valid JSON message and channels list', async () => {
      const actionParams = {
        subAction: 'postBlockkit',
        subActionParams: { channels: ['general'], text: JSON.stringify(testBlock) },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: [],
          channels: [],
        },
      });
    });

    it('should succeed when action params include valid JSON message and channels and channel ids', async () => {
      const actionParams = {
        subAction: 'postBlockkit',
        subActionParams: {
          channels: ['general'],
          channelIds: ['general'],
          text: JSON.stringify(testBlock),
        },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: [],
          channels: [],
        },
      });
    });

    it('should fail when channels field is missing in action params', async () => {
      const actionParams = {
        subAction: 'postBlockkit',
        subActionParams: { text: JSON.stringify(testBlock) },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: [],
          channels: ['Channel ID is required.'],
        },
      });
    });

    it('should fail when field text does not exist', async () => {
      const actionParams = {
        subAction: 'postBlockkit',
        subActionParams: { channels: ['general'] },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: ['Message is required.'],
          channels: [],
        },
      });
    });

    it('should fail when text is empty string', async () => {
      const actionParams = {
        subAction: 'postBlockkit',
        subActionParams: { channels: ['general'], text: '' },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: ['Message is required.'],
          channels: [],
        },
      });
    });

    it('should fail when text is invalid JSON', async () => {
      const actionParams = {
        subAction: 'postBlockkit',
        subActionParams: { channels: ['general'], text: 'abcd' },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: ['Block kit must be valid JSON.'],
          channels: [],
        },
      });
    });

    it('should fail when text is JSON but does not contain "blocks" property', async () => {
      const actionParams = {
        subAction: 'postBlockkit',
        subActionParams: { channels: ['general'], text: JSON.stringify({ foo: 'bar' }) },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: ['JSON must contain field "blocks".'],
          channels: [],
        },
      });
    });
  });

  describe('channels', () => {
    it('should fail when all channel variables are undefined', async () => {
      const actionParams = {
        subAction: 'postMessage',
        subActionParams: { text: 'some text' },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: [],
          channels: ['Channel ID is required.'],
        },
      });
    });

    it('should fail when all channel variables are empty', async () => {
      const actionParams = {
        subAction: 'postMessage',
        subActionParams: { text: 'some text', channelNames: [], channels: [], channelIds: [] },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: [],
          channels: ['Channel ID is required.'],
        },
      });
    });

    it.each([
      ['channelIds', undefined],
      ['channels', undefined],
      ['channelIds', []],
      ['channels', []],
    ])('should not fail when channelNames is set and %s is %s', async (key, value) => {
      const actionParams = {
        subAction: 'postMessage',
        subActionParams: { text: 'some text', channelNames: ['#test'], [key]: value },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: [],
          channels: [],
        },
      });
    });

    it.each([
      ['channelNames', undefined],
      ['channels', undefined],
      ['channelNames', []],
      ['channels', []],
    ])('should not fail when channelIds is set and %s is %s', async (key, value) => {
      const actionParams = {
        subAction: 'postMessage',
        subActionParams: { text: 'some text', channelIds: ['channel-id'], [key]: value },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: [],
          channels: [],
        },
      });
    });

    it.each([
      ['channelIds', undefined],
      ['channelNames', undefined],
      ['channelIds', []],
      ['channelNames', []],
    ])('should not fail when channels is set and %s is %s', async (key, value) => {
      const actionParams = {
        subAction: 'postMessage',
        subActionParams: { text: 'some text', channels: ['my-channel'], [key]: value },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: [],
          channels: [],
        },
      });
    });

    it('should not fail if channel names do not start with #', async () => {
      const actionParams = {
        subAction: 'postMessage',
        subActionParams: { text: 'some text', channelNames: ['test'] },
      };

      expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
        errors: {
          text: [],
          channels: ['Channel name must start with a #'],
        },
      });
    });
  });

  describe('default values', () => {
    it('sets the default values as expected', () => {
      expect(connectorTypeModel.defaultActionParams).toEqual({
        subAction: 'postMessage',
        subActionParams: { text: undefined },
      });

      expect(connectorTypeModel.defaultRecoveredActionParams).toEqual({
        subAction: 'postMessage',
        subActionParams: { text: undefined },
      });
    });
  });
});
