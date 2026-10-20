/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENT_POLICY_SENTINEL_VERSION,
  AGENT_POLICY_VERSION_SEPARATOR,
} from '../../common/constants';
import { POLICY_ID_FIXTURES } from '../../common/services/version_specific_policy_id_fixtures';

import { BACKFILL_SCRIPT } from './backfill_policy_base_id';

/**
 * Line by line port of `BACKFILL_SCRIPT`: Jest does not allow evaluating the Painless source, and
 * the script needs Elasticsearch to run. The inline snapshot below fails when the script changes, so
 * the port has to be updated with it, and the port is checked against the shared policy id fixtures.
 */
const runBackfillScriptPort = (source: Record<string, any>) => {
  const params = {
    separator: AGENT_POLICY_VERSION_SEPARATOR,
    sentinelVersion: AGENT_POLICY_SENTINEL_VERSION,
  };
  const ctx: { _source: Record<string, any>; op?: string } = { _source: { ...source } };
  if (
    ctx._source.policy_id == null ||
    (Object.hasOwn(ctx._source, 'policy_base_id') && ctx._source.policy_base_id != null)
  ) {
    ctx.op = 'noop';
    return ctx;
  }
  const pid: string = ctx._source.policy_id;
  const sepIdx = pid.lastIndexOf(params.separator);
  if (sepIdx >= 0) {
    const suffix = pid.substring(sepIdx + 1);
    const dotIdx = suffix.indexOf('.');
    let isVersion = dotIdx > 0 && suffix.length > dotIdx + 1;
    if (suffix === params.sentinelVersion) {
      isVersion = true;
    } else if (isVersion) {
      for (let i = 0; i < suffix.length; i++) {
        if (i !== dotIdx && !/^[0-9]$/.test(suffix.charAt(i))) {
          isVersion = false;
          break;
        }
      }
    }
    ctx._source.policy_base_id = isVersion ? pid.substring(0, sepIdx) : pid;
  } else {
    ctx._source.policy_base_id = pid;
  }
  return ctx;
};

describe('BACKFILL_SCRIPT', () => {
  it('has not changed, update runBackfillScriptPort together with it', () => {
    expect(BACKFILL_SCRIPT).toMatchInlineSnapshot(`
      "if (ctx._source.policy_id == null ||
            (ctx._source.containsKey('policy_base_id') && ctx._source.policy_base_id != null)) {
          ctx.op = 'noop';
          return;
        }
        String pid = ctx._source.policy_id;
        int sepIdx = pid.lastIndexOf(params.separator);
        if (sepIdx >= 0) {
          String suffix = pid.substring(sepIdx + 1);
          int dotIdx = suffix.indexOf('.');
          boolean isVersion = dotIdx > 0 && suffix.length() > dotIdx + 1;
          if (suffix == params.sentinelVersion) {
            isVersion = true;
          } else if (isVersion) {
            for (int i = 0; i < suffix.length(); i++) {
              if (i != dotIdx && !Character.isDigit(suffix.charAt(i))) { isVersion = false; break; }
            }
          }
          ctx._source.policy_base_id = isVersion ? pid.substring(0, sepIdx) : pid;
        } else {
          ctx._source.policy_base_id = pid;
        }"
    `);
  });

  it.each(POLICY_ID_FIXTURES)('sets policy_base_id for $policyId', ({ policyId, baseId }) => {
    expect(runBackfillScriptPort({ policy_id: policyId })._source.policy_base_id).toBe(baseId);
  });

  it('does not overwrite an existing policy_base_id', () => {
    const ctx = runBackfillScriptPort({ policy_id: 'policy1#9.4', policy_base_id: 'other' });

    expect(ctx.op).toBe('noop');
    expect(ctx._source.policy_base_id).toBe('other');
  });

  it('ignores documents without policy_id', () => {
    expect(runBackfillScriptPort({}).op).toBe('noop');
  });
});
