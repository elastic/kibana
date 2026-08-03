/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_NAME, ALERT_STATUS, ALERT_DURATION } from '@kbn/rule-data-utils';
import { getAlertsDataViewBase } from './get_alerts_data_view_base';

describe('getAlertsDataViewBase', () => {
  it('should return a DataViewBase with the alerts index pattern', () => {
    const dataView = getAlertsDataViewBase();
    expect(dataView.title).toBe('.alerts-*');
    expect(dataView.fields.length).toBeGreaterThan(0);
  });

  it('should map keyword fields with correct esTypes', () => {
    const dataView = getAlertsDataViewBase();
    const ruleNameField = dataView.fields.find((f) => f.name === ALERT_RULE_NAME);

    expect(ruleNameField).toBeDefined();
    expect(ruleNameField!.type).toBe('string');
    expect(ruleNameField!.esTypes).toEqual(['keyword']);
  });

  it('should map date fields correctly', () => {
    const dataView = getAlertsDataViewBase();
    const statusField = dataView.fields.find((f) => f.name === ALERT_STATUS);

    expect(statusField).toBeDefined();
    expect(statusField!.type).toBe('string');
    expect(statusField!.esTypes).toEqual(['keyword']);
  });

  it('should map long fields as number type', () => {
    const dataView = getAlertsDataViewBase();
    const durationField = dataView.fields.find((f) => f.name === ALERT_DURATION);

    expect(durationField).toBeDefined();
    expect(durationField!.type).toBe('number');
    expect(durationField!.esTypes).toEqual(['long']);
  });
});
