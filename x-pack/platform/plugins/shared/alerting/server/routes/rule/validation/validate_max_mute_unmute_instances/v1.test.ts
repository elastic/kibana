/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type Boom from '@hapi/boom';
import { MAX_MUTE_INSTANCES, validateMaxMuteUnmuteInstances } from './v1';
import type { BulkMuteUnmuteAlertsRequestBodyV1 } from '../../../../../common/routes/rule/apis/bulk_mute_unmute';

describe('validateMaxMuteUnmuteInstances', () => {
  it(`should not throw an error if total instances are less than ${MAX_MUTE_INSTANCES}`, () => {
    const body: BulkMuteUnmuteAlertsRequestBodyV1 = {
      rules: [
        { rule_id: 'rule-1', alert_instance_ids: ['id-1', 'id-2'] },
        { rule_id: 'rule-2', alert_instance_ids: ['id-3'] },
      ],
    };
    expect(() => validateMaxMuteUnmuteInstances(body)).to.not.throwError();
  });

  it(`should not throw an error if total instances are exactly ${MAX_MUTE_INSTANCES}`, () => {
    const hundredIds = Array.from({ length: MAX_MUTE_INSTANCES }, (_, i) => `id-${i}`);
    const body: BulkMuteUnmuteAlertsRequestBodyV1 = {
      rules: [{ rule_id: 'rule-1', alert_instance_ids: hundredIds }],
    };
    expect(() => validateMaxMuteUnmuteInstances(body)).to.not.throwError();
  });

  it(`should throw Boom.badRequest if total instances are greater than ${MAX_MUTE_INSTANCES}`, () => {
    const hundredOneIds = Array.from({ length: MAX_MUTE_INSTANCES + 1 }, (_, i) => `id-${i}`);
    const body: BulkMuteUnmuteAlertsRequestBodyV1 = {
      rules: [{ rule_id: 'rule-1', alert_instance_ids: hundredOneIds }],
    };
    expect(() => validateMaxMuteUnmuteInstances(body)).to.throwError((e: Boom.Boom) => {
      expect(e.isBoom).to.be(true);
      expect(e.output.statusCode).to.be(400);
      expect(e.message).to.be(
        `The total number of alert instances to mute cannot exceed ${MAX_MUTE_INSTANCES}.`
      );
    });
  });

  it(`should handle multiple rules combining to over ${MAX_MUTE_INSTANCES} instances`, () => {
    const sixtyIds = Array.from({ length: MAX_MUTE_INSTANCES / 2 + 10 }, (_, i) => `id-A-${i}`);
    const fiftyIds = Array.from({ length: MAX_MUTE_INSTANCES / 2 }, (_, i) => `id-B-${i}`);
    const body: BulkMuteUnmuteAlertsRequestBodyV1 = {
      rules: [
        { rule_id: 'rule-A', alert_instance_ids: sixtyIds },
        { rule_id: 'rule-B', alert_instance_ids: fiftyIds },
      ],
    }; // Total 110
    expect(() => validateMaxMuteUnmuteInstances(body)).to.throwError((e: Boom.Boom) => {
      expect(e.isBoom).to.be(true);
      expect(e.output.statusCode).to.be(400);
      expect(e.message).to.be(
        `The total number of alert instances to mute cannot exceed ${MAX_MUTE_INSTANCES}.`
      );
    });
  });

  it('should not throw an error for an empty body (no rules)', () => {
    const body: BulkMuteUnmuteAlertsRequestBodyV1 = {
      rules: [],
    };
    expect(() => validateMaxMuteUnmuteInstances(body)).to.not.throwError();
  });

  it('should not throw an error for rules with empty alert_instance_ids', () => {
    const body: BulkMuteUnmuteAlertsRequestBodyV1 = {
      rules: [
        { rule_id: 'rule-1', alert_instance_ids: [] },
        { rule_id: 'rule-2', alert_instance_ids: [] },
      ],
    };
    expect(() => validateMaxMuteUnmuteInstances(body)).to.not.throwError();
  });
});
