/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { shouldCreateAlertsInAllSpaces } from './should_create_alerts_in_all_spaces';
import { loggingSystemMock } from '@kbn/core/server/mocks';

const logger = loggingSystemMock.createLogger();

describe('shouldCreateAlertsInAllSpaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('returns false if alert definition is undefined', () => {
    expect(
      shouldCreateAlertsInAllSpaces({
        ruleTypeId: 'test.rule-type',
        logger,
      })
    ).toBe(false);
    expect(logger.warn).not.toHaveBeenCalled();
  });
  it('returns false if dangerouslyCreateAlertsInAllSpaces is undefined', () => {
    expect(
      shouldCreateAlertsInAllSpaces({
        ruleTypeId: 'test.rule-type',
        ruleTypeAlertDef: {
          context: 'test',
          mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
          shouldWrite: true,
          isSpaceAware: true,
        },
        logger,
      })
    ).toBe(false);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns false if dangerouslyCreateAlertsInAllSpaces is false', () => {
    expect(
      shouldCreateAlertsInAllSpaces({
        ruleTypeId: 'test.rule-type',
        ruleTypeAlertDef: {
          context: 'test',
          mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
          shouldWrite: true,
          dangerouslyCreateAlertsInAllSpaces: false,
        },
        logger,
      })
    ).toBe(false);
    expect(logger.warn).not.toHaveBeenCalled();
  });
  it('returns true if dangerouslyCreateAlertsInAllSpaces is true and isSpaceAware is undefined', () => {
    expect(
      shouldCreateAlertsInAllSpaces({
        ruleTypeId: 'test.rule-type',
        ruleTypeAlertDef: {
          context: 'test',
          mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
          shouldWrite: true,
          dangerouslyCreateAlertsInAllSpaces: true,
        },
        logger,
      })
    ).toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
  });
  it('returns true if dangerouslyCreateAlertsInAllSpaces is true and isSpaceAware is false', () => {
    expect(
      shouldCreateAlertsInAllSpaces({
        ruleTypeId: 'test.rule-type',
        ruleTypeAlertDef: {
          context: 'test',
          mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
          shouldWrite: true,
          isSpaceAware: false,
          dangerouslyCreateAlertsInAllSpaces: true,
        },
        logger,
      })
    ).toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
  });
  it('returns false and logs warning if dangerouslyCreateAlertsInAllSpaces is true and isSpaceAware is true', () => {
    expect(
      shouldCreateAlertsInAllSpaces({
        ruleTypeId: 'test.rule-type',
        ruleTypeAlertDef: {
          context: 'test',
          mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
          shouldWrite: true,
          isSpaceAware: true,
          dangerouslyCreateAlertsInAllSpaces: true,
        },
        logger,
      })
    ).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      `Rule type \"test.rule-type\" is space aware but also has \"dangerouslyCreateAlertsInAllSpaces\" set to true. This is not supported so alerts will be created with the space ID of the rule.`
    );
  });
});
