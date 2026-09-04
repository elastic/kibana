/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { collectTelemetryData } from './collect_telemetry_data';
import { TelemetrySavedObjectsClient } from './telemetry_saved_objects_client';
import { getAlertsTelemetryData } from './queries/alerts';
import { getCasesTelemetryData } from './queries/cases';
import { getCasesSystemActionData } from './queries/case_system_action';
import { getUserCommentsTelemetryData } from './queries/comments';
import { getConfigurationTelemetryData } from './queries/configuration';
import { getConnectorsTelemetryData } from './queries/connectors';
import { getPushedTelemetryData } from './queries/push';
import { getUserActionsTelemetryData } from './queries/user_actions';
import {
  getEmptyFieldLibraryTelemetry,
  getFieldLibraryTelemetryData,
} from './queries/field_definitions';

jest.mock('./queries/alerts');
jest.mock('./queries/cases');
jest.mock('./queries/case_system_action');
jest.mock('./queries/comments');
jest.mock('./queries/configuration');
jest.mock('./queries/connectors');
jest.mock('./queries/push');
jest.mock('./queries/user_actions');

// The read is mocked outright, but the zeroed-shape builder keeps its real implementation so the
// flag-off assertions check the shape the payload contract actually declares. It is still wrapped
// in a `jest.fn` so one test can make it throw.
jest.mock('./queries/field_definitions', () => {
  const actual = jest.requireActual('./queries/field_definitions');

  return {
    ...actual,
    getFieldLibraryTelemetryData: jest.fn(),
    getEmptyFieldLibraryTelemetry: jest.fn(actual.getEmptyFieldLibraryTelemetry),
  };
});

const getFieldLibraryMock = getFieldLibraryTelemetryData as jest.Mock;
const getEmptyFieldLibraryMock = getEmptyFieldLibraryTelemetry as jest.Mock;
const realGetEmptyFieldLibrary = jest.requireActual('./queries/field_definitions')
  .getEmptyFieldLibraryTelemetry as typeof getEmptyFieldLibraryTelemetry;

const preExistingAreas = {
  cases: getCasesTelemetryData as jest.Mock,
  userActions: getUserActionsTelemetryData as jest.Mock,
  comments: getUserCommentsTelemetryData as jest.Mock,
  alerts: getAlertsTelemetryData as jest.Mock,
  connectors: getConnectorsTelemetryData as jest.Mock,
  pushes: getPushedTelemetryData as jest.Mock,
  configuration: getConfigurationTelemetryData as jest.Mock,
  casesSystemAction: getCasesSystemActionData as jest.Mock,
};

// Asserted whole rather than key by key, so an area that goes missing fails the comparison.
const preExistingPayload = () =>
  Object.fromEntries(Object.keys(preExistingAreas).map((area) => [area, area]));

const zeroedScope = { total: 0, totalGlobal: 0, totalReusable: 0 };
const populatedScope = { total: 9, totalGlobal: 5, totalReusable: 4 };

describe('collectTelemetryData', () => {
  const logger = loggingSystemMock.createLogger();
  const savedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsRepositoryMock.create());

  const collect = (templatesEnabled: boolean) =>
    collectTelemetryData({ savedObjectsClient, logger, templatesEnabled });

  beforeEach(() => {
    jest.resetAllMocks();

    // `resetAllMocks` drops the wrapped real implementation, so restore it.
    getEmptyFieldLibraryMock.mockImplementation(realGetEmptyFieldLibrary);

    // Each pre-existing area resolves to its own key name, so an assertion that one area survived
    // cannot pass on another area's value.
    Object.entries(preExistingAreas).forEach(([area, mock]) => mock.mockResolvedValue(area));
    getFieldLibraryMock.mockResolvedValue({
      all: populatedScope,
      sec: populatedScope,
      obs: populatedScope,
      main: populatedScope,
    });
  });

  describe('when the templates feature flag is on', () => {
    it('reports the flag as on, alongside every pre-existing area', async () => {
      const result = await collect(true);

      expect(getFieldLibraryMock).toHaveBeenCalledWith({ savedObjectsClient, logger });
      expect(result).toStrictEqual({
        ...preExistingPayload(),
        fieldLibrary: {
          featureEnabled: true,
          all: populatedScope,
          sec: populatedScope,
          obs: populatedScope,
          main: populatedScope,
        },
      });
    });
  });

  describe('when the templates feature flag is off', () => {
    it('reports the flag as off and zeroed counts, without reading', async () => {
      const result = await collect(false);

      expect(getFieldLibraryMock).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        ...preExistingPayload(),
        fieldLibrary: {
          featureEnabled: false,
          all: zeroedScope,
          sec: zeroedScope,
          obs: zeroedScope,
          main: zeroedScope,
        },
      });
    });
  });

  describe('when the field library read fails', () => {
    beforeEach(() => {
      getFieldLibraryMock.mockRejectedValue(new Error('failed'));
    });

    it('omits only the field library key, leaving every other area intact', async () => {
      const result = await collect(true);

      // Absent, not zeroed: zeroed would be indistinguishable from a deployment that has no
      // field definitions.
      expect(result).toStrictEqual(preExistingPayload());
    });
  });

  describe('when a pre-existing area fails', () => {
    it('discards the whole payload, field library included', async () => {
      preExistingAreas.cases.mockRejectedValue(new Error('failed'));

      expect(await collect(true)).toStrictEqual({});
    });

    /**
     * Guards the shape rather than the current behaviour: while the read sits inside
     * `Promise.all` its rejection is always handled. Hoisting it to a variable and catching at
     * the `await` instead leaves it unhandled whenever a sibling area rejects first, and no
     * other test here notices.
     */
    it('leaves no unhandled rejection when the field library loses the race', async () => {
      const unhandled = jest.fn();
      process.on('unhandledRejection', unhandled);

      getFieldLibraryMock.mockImplementation(
        () =>
          new Promise((_, reject) => setImmediate(() => reject(new Error('field library failed'))))
      );
      preExistingAreas.cases.mockRejectedValue(new Error('cases failed'));

      expect(await collect(true)).toStrictEqual({});
      await new Promise(setImmediate);

      process.off('unhandledRejection', unhandled);
      expect(unhandled).not.toHaveBeenCalled();
    });
  });
});
