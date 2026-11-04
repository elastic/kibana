/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toKqlExpression } from '@kbn/es-query';
import { buildRuleHealthKueryNode, isSameRuleHealthSelection } from './rule_health_filters';

describe('buildRuleHealthKueryNode', () => {
  it('selects failed, warning and missing-key rules for "problems"', () => {
    expect(toKqlExpression(buildRuleHealthKueryNode({ type: 'problems' }))).toBe(
      '(alert.attributes.lastRun.outcome: failed OR alert.attributes.lastRun.outcome: warning OR (alert.attributes.tags: "Missing Elastic Cloud API Key" OR alert.attributes.tags: "Missing Universal Api Key"))'
    );
  });

  it('selects by outcome', () => {
    expect(toKqlExpression(buildRuleHealthKueryNode({ type: 'outcome', outcome: 'failed' }))).toBe(
      'alert.attributes.lastRun.outcome: failed'
    );
  });

  it('selects by error and warning reason', () => {
    expect(
      toKqlExpression(buildRuleHealthKueryNode({ type: 'errorReason', reason: 'validate' }))
    ).toBe('alert.attributes.executionStatus.error.reason: validate');
    expect(
      toKqlExpression(buildRuleHealthKueryNode({ type: 'warningReason', reason: 'maxAlerts' }))
    ).toBe('alert.attributes.executionStatus.warning.reason: maxAlerts');
  });

  it('quotes the message when selecting by error message', () => {
    expect(
      toKqlExpression(
        buildRuleHealthKueryNode({
          type: 'errorMessage',
          reason: 'execute',
          message: 'No such field: foo',
        })
      )
    ).toBe(
      '(alert.attributes.executionStatus.error.reason: execute AND alert.attributes.executionStatus.error.message: "No such field: foo")'
    );
  });

  it('matches API key rejection messages exactly and UIAM codes with wildcards', () => {
    expect(
      toKqlExpression(
        buildRuleHealthKueryNode({
          type: 'apiKeyError',
          messages: ['security_exception: unable to authenticate with provided credentials'],
        })
      )
    ).toBe(
      '(alert.attributes.executionStatus.error.reason: unauthorized OR alert.attributes.executionStatus.error.message: "security_exception: unable to authenticate with provided credentials" OR alert.attributes.executionStatus.error.message: *0x28D520* OR alert.attributes.executionStatus.error.message: *0xD38358* OR alert.attributes.executionStatus.error.message: *0x7E0116*)'
    );
  });

  it('selects both missing-key tags', () => {
    expect(toKqlExpression(buildRuleHealthKueryNode({ type: 'missingApiKey' }))).toBe(
      '(alert.attributes.tags: "Missing Elastic Cloud API Key" OR alert.attributes.tags: "Missing Universal Api Key")'
    );
  });
});

describe('isSameRuleHealthSelection', () => {
  it('compares by type and payload', () => {
    expect(isSameRuleHealthSelection({ type: 'problems' }, { type: 'problems' })).toBe(true);
    expect(isSameRuleHealthSelection({ type: 'problems' }, { type: 'missingApiKey' })).toBe(false);
    expect(
      isSameRuleHealthSelection(
        { type: 'errorReason', reason: 'a' },
        { type: 'errorReason', reason: 'a' }
      )
    ).toBe(true);
    expect(
      isSameRuleHealthSelection(
        { type: 'errorReason', reason: 'a' },
        { type: 'errorReason', reason: 'b' }
      )
    ).toBe(false);
    expect(
      isSameRuleHealthSelection(
        { type: 'errorMessage', reason: 'a', message: 'x' },
        { type: 'errorMessage', reason: 'a', message: 'y' }
      )
    ).toBe(false);
  });
});
