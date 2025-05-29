/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__';
import {
  Connector,
  ConnectorStatus,
  DisplayType,
  FieldType,
  FilteringValidationState,
  SyncStatus,
} from '@kbn/search-connectors';

import { SyncsLogic } from './syncs_logic';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

const mockConnector: Connector = {
  id: '123',
  api_key_id: '123123',
  api_key_secret_id: '321321',
  configuration: {
    config_value: {
      default_value: null,
      depends_on: [],
      display: DisplayType.TEXTBOX,
      label: 'textbox value',
      options: [],
      order: 0,
      required: true,
      sensitive: false,
      tooltip: 'tooltip',
      type: FieldType.STRING,
      ui_restrictions: [],
      validations: [],
      value: '123',
    },
  },
  custom_scheduling: {},
  deleted: false,
  description: 'test',
  error: null,
  features: {
    document_level_security: {
      enabled: false,
    },
    incremental_sync: {
      enabled: false,
    },
    sync_rules: {
      advanced: {
        enabled: false,
      },
      basic: {
        enabled: false,
      },
    },
  },
  filtering: [
    {
      active: {
        advanced_snippet: {
          created_at: '2024-05-28T11:27:53.460Z',
          updated_at: '2024-05-28T11:27:53.460Z',
          value: {},
        },
        rules: [
          {
            created_at: '2024-05-28T11:27:53.460Z',
            field: '_',
            id: 'DEFAULT',
            order: 0,
            policy: 'include',
            rule: 'regex',
            updated_at: '2024-05-28T11:27:53.460Z',
            value: '.*',
          },
        ],
        validation: {
          errors: [],
          state: FilteringValidationState.VALID,
        },
      },
      domain: 'DEFAULT',
      draft: {
        advanced_snippet: {
          created_at: '2024-05-28T11:27:53.460Z',
          updated_at: '2024-05-28T11:27:53.460Z',
          value: {},
        },
        rules: [
          {
            created_at: '2024-05-28T11:27:53.460Z',
            field: '_',
            id: 'DEFAULT',
            order: 0,
            policy: 'include',
            rule: 'regex',
            updated_at: '2024-05-28T11:27:53.460Z',
            value: '.*',
          },
        ],
        validation: {
          errors: [],
          state: FilteringValidationState.VALID,
        },
      },
    },
  ],
  index_name: 'test',
  is_native: false,
  language: null,
  last_access_control_sync_error: null,
  last_access_control_sync_scheduled_at: null,
  last_access_control_sync_status: SyncStatus.CANCELED,
  last_deleted_document_count: 0,
  last_incremental_sync_scheduled_at: null,
  last_indexed_document_count: 44,
  last_seen: '2024-05-31T12:55:30.301795+00:00',
  last_sync_error: null,
  last_sync_scheduled_at: null,
  last_sync_status: SyncStatus.COMPLETED,
  last_synced: '2024-05-31T12:42:17.191699+00:00',
  name: 'test',
  pipeline: {
    extract_binary_content: true,
    name: 'search-default-ingestion',
    reduce_whitespace: true,
    run_ml_inference: true,
  },
  scheduling: {
    access_control: {
      enabled: false,
      interval: '0 0 0 * * ?',
    },
    full: {
      enabled: false,
      interval: '0 0 0 * * ?',
    },
    incremental: {
      enabled: false,
      interval: '0 0 0 * * ?',
    },
  },
  service_type: 'gmail',
  status: ConnectorStatus.CONNECTED,
  sync_now: false,
};
const http = httpServiceMock.createSetupContract();

describe('SyncsLogic', () => {
  const { mount } = new LogicMounter(SyncsLogic);
  const DEFAULT_VALUES = {};

  let result = SyncsLogic;

  beforeEach(() => {
    jest.clearAllMocks();
    result = mount(DEFAULT_VALUES, { http });
  });
  it('has expected default values', () => {
    expect(result.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('cancelSyncs', () => {
      it("should not call makeCancelSyncRequest if connector doesn't exist", () => {
        result.actions.makeCancelSyncsRequest = jest.fn();
        result.actions.cancelSyncs(undefined);
        expect(result.actions.makeCancelSyncsRequest).not.toHaveBeenCalled();
      });
      it('should call clearFlashMessages and request if a connector is passed', () => {
        result.actions.makeCancelSyncsRequest = jest.fn();
        result.actions.cancelSyncs(mockConnector);
        expect(result.actions.makeCancelSyncsRequest).toHaveBeenCalled();
      });
    });

    describe('startAccessControlSync', () => {
      it("should not call makeStartAccessControlSyncRequest if connector doesn't exist", () => {
        result.actions.makeStartAccessControlSyncRequest = jest.fn();
        result.actions.startAccessControlSync(undefined);
        expect(result.actions.makeStartAccessControlSyncRequest).not.toHaveBeenCalled();
      });
      it('should call makeStartAccessControlSyncRequest if a connector is passed', () => {
        result.actions.makeStartAccessControlSyncRequest = jest.fn();
        result.actions.startAccessControlSync({
          ...mockConnector,
          features: {
            ...mockConnector.features,
            document_level_security: { enabled: true },
          },
        });
        expect(result.actions.makeStartAccessControlSyncRequest).toHaveBeenCalled();
      });
      it('should not call makeStartAccessControlSyncRequest if incremental sync is not enabled', () => {
        result.actions.makeStartAccessControlSyncRequest = jest.fn();
        result.actions.startAccessControlSync({ ...mockConnector, features: {} });
        expect(result.actions.makeStartAccessControlSyncRequest).not.toHaveBeenCalled();
      });
    });

    describe('startIncrementalSync', () => {
      it("should not call makeStartIncrementalSyncRequest if connector doesn't exist", () => {
        result.actions.makeStartIncrementalSyncRequest = jest.fn();
        result.actions.startIncrementalSync(undefined);
        expect(result.actions.makeStartIncrementalSyncRequest).not.toHaveBeenCalled();
      });
      it('should call makeStartIncrementalSyncRequest if a connector is passed', () => {
        result.actions.makeStartIncrementalSyncRequest = jest.fn();
        result.actions.startIncrementalSync({
          ...mockConnector,
          features: {
            ...mockConnector.features,
            incremental_sync: { enabled: true },
          },
        });
        expect(result.actions.makeStartIncrementalSyncRequest).toHaveBeenCalled();
      });
      it('should not call makeStartIncrementalSyncRequest if incremental sync is not enabled', () => {
        result.actions.makeStartIncrementalSyncRequest = jest.fn();
        result.actions.startIncrementalSync({ ...mockConnector, features: {} });
        expect(result.actions.makeStartIncrementalSyncRequest).not.toHaveBeenCalled();
      });
    });

    describe('startSync', () => {
      it("should not call makeStartSyncRequest if connector doesn't exist", () => {
        result.actions.makeStartSyncRequest = jest.fn();
        result.actions.startSync(undefined);
        expect(result.actions.makeStartSyncRequest).not.toHaveBeenCalled();
      });
      it('should call makeStartSyncRequest if a connector is passed', () => {
        result.actions.makeStartSyncRequest = jest.fn();
        result.actions.startSync(mockConnector);
        expect(result.actions.makeStartSyncRequest).toHaveBeenCalled();
      });
    });
  });
});
