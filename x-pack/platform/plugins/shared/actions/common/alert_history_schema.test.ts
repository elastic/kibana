/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertHistoryDocument } from './alert_history_schema';

function getVariables(overrides = {}) {
  return {
    date: '2021-01-01T00:00:00.000Z',
    rule: {
      id: 'rule-id',
      name: 'rule-name',
      type: 'rule-type',
      spaceId: 'space-id',
    },
    context: {
      contextVar1: 'contextValue1',
      contextVar2: 'contextValue2',
    },
    params: {
      ruleParam: 1,
      ruleParamString: 'another param',
    },
    tags: ['abc', 'def'],
    alert: {
      id: 'alert-id',
      actionGroup: 'action-group-id',
      actionGroupName: 'Action Group',
    },
    ...overrides,
  };
}

describe('buildAlertHistoryDocument', () => {
  it('handles empty variables', () => {
    expect(buildAlertHistoryDocument({})).toBeNull();
  });

  it('returns null if rule type is not defined', () => {
    expect(buildAlertHistoryDocument(getVariables({ rule: { type: undefined } }))).toBeNull();
  });

  it('returns null if alert variables are not defined', () => {
    expect(buildAlertHistoryDocument(getVariables({ alert: undefined }))).toBeNull();
  });

  it('returns null if rule variables are not defined', () => {
    expect(buildAlertHistoryDocument(getVariables({ rule: undefined }))).toBeNull();
  });

  it('includes @timestamp field if date is null', () => {
    const alertHistoryDoc = buildAlertHistoryDocument(getVariables({ date: undefined }));
    expect(alertHistoryDoc).not.toBeNull();
    expect(alertHistoryDoc!['@timestamp']).toBeTruthy();
  });

  it(`doesn't include context if context is empty`, () => {
    const alertHistoryDoc = buildAlertHistoryDocument(getVariables({ context: {} }));
    expect(alertHistoryDoc).not.toBeNull();
    expect(alertHistoryDoc!.kibana?.alert?.context).toBeFalsy();
  });

  it(`doesn't include params if params is empty`, () => {
    const alertHistoryDoc = buildAlertHistoryDocument(getVariables({ params: {} }));
    expect(alertHistoryDoc).not.toBeNull();
    expect(alertHistoryDoc!.rule?.params).toBeFalsy();
  });

  it(`doesn't include tags if tags is empty array`, () => {
    const alertHistoryDoc = buildAlertHistoryDocument(getVariables({ tags: [] }));
    expect(alertHistoryDoc).not.toBeNull();
    expect(alertHistoryDoc!.tags).toBeFalsy();
  });

  it(`included message if context contains message`, () => {
    const alertHistoryDoc = buildAlertHistoryDocument(
      getVariables({
        context: { contextVar1: 'contextValue1', contextVar2: 'contextValue2', message: 'hello!' },
      })
    );
    expect(alertHistoryDoc).not.toBeNull();
    expect(alertHistoryDoc!.message).toEqual('hello!');
  });

  it('builds alert history document from variables', () => {
    expect(buildAlertHistoryDocument(getVariables())).toEqual({
      '@timestamp': '2021-01-01T00:00:00.000Z',
      kibana: {
        alert: {
          actionGroup: 'action-group-id',
          actionGroupName: 'Action Group',
          context: {
            'rule-type': {
              contextVar1: 'contextValue1',
              contextVar2: 'contextValue2',
            },
          },
          id: 'alert-id',
        },
      },
      event: {
        kind: 'alert',
      },
      rule: {
        id: 'rule-id',
        name: 'rule-name',
        params: {
          'rule-type': {
            ruleParam: 1,
            ruleParamString: 'another param',
          },
        },
        space: 'space-id',
        type: 'rule-type',
      },
      tags: ['abc', 'def'],
    });
  });
});
