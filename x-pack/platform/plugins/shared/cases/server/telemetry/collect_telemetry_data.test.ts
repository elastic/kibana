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
import { getEmptyTemplatesTelemetry, getTemplatesTelemetryData } from './queries/templates';

jest.mock('./queries/alerts');
jest.mock('./queries/cases');
jest.mock('./queries/case_system_action');
jest.mock('./queries/comments');
jest.mock('./queries/configuration');
jest.mock('./queries/connectors');
jest.mock('./queries/push');
jest.mock('./queries/user_actions');

// The query is mocked outright. The zeroed-shape builder keeps its real implementation,
// so the flag-off assertions below check the shape the payload contract actually declares
// — but it is wrapped in a `jest.fn` so one test can make it throw.
jest.mock('./queries/templates', () => {
  const actual = jest.requireActual('./queries/templates');

  return {
    ...actual,
    getTemplatesTelemetryData: jest.fn(),
    getEmptyTemplatesTelemetry: jest.fn(actual.getEmptyTemplatesTelemetry),
  };
});

const getAlertsMock = getAlertsTelemetryData as jest.Mock;
const getCasesMock = getCasesTelemetryData as jest.Mock;
const getCasesSystemActionMock = getCasesSystemActionData as jest.Mock;
const getCommentsMock = getUserCommentsTelemetryData as jest.Mock;
const getConfigurationMock = getConfigurationTelemetryData as jest.Mock;
const getConnectorsMock = getConnectorsTelemetryData as jest.Mock;
const getPushesMock = getPushedTelemetryData as jest.Mock;
const getUserActionsMock = getUserActionsTelemetryData as jest.Mock;
const getTemplatesMock = getTemplatesTelemetryData as jest.Mock;
const getEmptyTemplatesMock = getEmptyTemplatesTelemetry as jest.Mock;
const realGetEmptyTemplates = jest.requireActual('./queries/templates')
  .getEmptyTemplatesTelemetry as typeof getEmptyTemplatesTelemetry;

const preExistingAreas = {
  cases: getCasesMock,
  userActions: getUserActionsMock,
  comments: getCommentsMock,
  alerts: getAlertsMock,
  connectors: getConnectorsMock,
  pushes: getPushesMock,
  configuration: getConfigurationMock,
  casesSystemAction: getCasesSystemActionMock,
};

const zeroCount = { total: 0, monthly: 0, weekly: 0, daily: 0 };

const zeroedTemplatesScope = {
  total: 0,
  totalEnabled: 0,
  totalDisabled: 0,
  totalSoftDeleted: 0,
  totalMigratedFromV1: 0,
  versionPercentiles: { p50: 0, p90: 0, p99: 0 },
  fieldCount: { total: 0, max: 0, average: 0 },
  fieldDefinitions: { totalsByControl: {}, totalsByType: {} },
  cases: { withTemplate: zeroCount, withoutTemplate: zeroCount },
};

const templatesScope = { ...zeroedTemplatesScope, total: 7 };

// The payload every pre-existing area is expected to contribute. Asserted whole rather than
// per key, so an area that goes missing or gains a stray key fails the comparison.
const preExistingPayload = () =>
  Object.fromEntries(Object.keys(preExistingAreas).map((area) => [area, area]));

describe('collectTelemetryData', () => {
  const logger = loggingSystemMock.createLogger();
  const savedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsRepositoryMock.create());

  const collect = (templatesEnabled: boolean) =>
    collectTelemetryData({ savedObjectsClient, logger, templatesEnabled });

  beforeEach(() => {
    jest.resetAllMocks();

    // `resetAllMocks` drops the wrapped real implementation, so restore it.
    getEmptyTemplatesMock.mockImplementation(realGetEmptyTemplates);

    // Each pre-existing area resolves to its own key name, so an assertion that one area
    // survived cannot pass on another area's value.
    Object.entries(preExistingAreas).forEach(([area, mock]) => mock.mockResolvedValue(area));
    getTemplatesMock.mockResolvedValue({
      all: templatesScope,
      sec: templatesScope,
      obs: templatesScope,
      main: templatesScope,
    });
  });

  describe('when the templates feature flag is on', () => {
    it('reports the flag as on, alongside every pre-existing area', async () => {
      const result = await collect(true);

      expect(getTemplatesMock).toHaveBeenCalledWith({ savedObjectsClient, logger });
      expect(result).toStrictEqual({
        ...preExistingPayload(),
        templates: {
          featureEnabled: true,
          all: templatesScope,
          sec: templatesScope,
          obs: templatesScope,
          main: templatesScope,
        },
      });
    });
  });

  describe('when the templates feature flag is off', () => {
    it('does not query templates at all', async () => {
      await collect(false);

      expect(getTemplatesMock).not.toHaveBeenCalled();
    });

    it('reports the flag as off with zeroed scopes, alongside every pre-existing area', async () => {
      const result = await collect(false);

      expect(result).toStrictEqual({
        ...preExistingPayload(),
        templates: {
          featureEnabled: false,
          all: zeroedTemplatesScope,
          sec: zeroedTemplatesScope,
          obs: zeroedTemplatesScope,
          main: zeroedTemplatesScope,
        },
      });
    });
  });

  describe('when the templates query fails', () => {
    beforeEach(() => {
      getTemplatesMock.mockRejectedValue(new Error('templates boom'));
    });

    it('omits the templates key rather than reporting zeroed counts', async () => {
      const result = await collect(true);

      // Absent, not zero-filled: a zero would be indistinguishable from a deployment that
      // has the feature on and no templates.
      expect(result).not.toHaveProperty('templates');
    });

    it('leaves every other area intact', async () => {
      const result = await collect(true);

      expect(result).toStrictEqual(preExistingPayload());
    });

    it('logs the failure', async () => {
      await collect(true);

      expect(logger.debug).toHaveBeenCalledWith('Failed collecting Cases templates telemetry data');
    });
  });

  describe('when the flag-off path itself fails', () => {
    // The boundary is a `.catch` on the promise rather than a `try` inside it, so it covers
    // the flag-off branch too and does not depend on the zeroed builder being infallible.
    beforeEach(() => {
      getEmptyTemplatesMock.mockImplementation(() => {
        throw new Error('zero-fill boom');
      });
    });

    it('omits templates and keeps every other area', async () => {
      const result = await collect(false);

      expect(result).toStrictEqual(preExistingPayload());
    });
  });

  describe('when a pre-existing area fails', () => {
    // The pre-existing contract: any failure here discards the whole payload so that an
    // error is distinguishable from a cluster that simply does not use cases. This step
    // must not change that, templates included.
    it.each(Object.keys(preExistingAreas))('empties the whole payload for %s', async (area) => {
      preExistingAreas[area as keyof typeof preExistingAreas].mockRejectedValue(
        new Error(`${area} boom`)
      );

      expect(await collect(true)).toStrictEqual({});
    });

    it('discards a successfully collected templates area too', async () => {
      getCasesMock.mockRejectedValue(new Error('cases boom'));

      const result = await collect(true);

      expect(getTemplatesMock).toHaveBeenCalled();
      expect(result).toStrictEqual({});
    });
  });
});
