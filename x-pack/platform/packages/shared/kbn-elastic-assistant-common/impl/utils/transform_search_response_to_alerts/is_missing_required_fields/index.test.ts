/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_EXECUTION_UUID } from '@kbn/rule-data-utils';
import { omit } from 'lodash/fp';

import { getMissingFields, isMissingRequiredFields } from '.';
import { getResponseMock } from '../../../mock/attack_discovery_alert_document_response';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_TITLE,
} from '../../../schedules/field_names';

describe('isMissingRequiredFields', () => {
  const getHit = () => {
    const mock = getResponseMock();

    const hit = mock.hits.hits[0];
    return {
      ...hit,
      _source: hit._source ? { ...hit._source } : hit._source,
    };
  };

  it('returns false for a valid document', () => {
    const hit = getHit();

    expect(isMissingRequiredFields(hit)).toBe(false);
  });

  it('returns true if _source is null', () => {
    const hit = getHit();
    // Simulate _source being undefined while keeping the rest of the shape
    const hitWithUndefinedSource = { ...hit };
    delete hitWithUndefinedSource._source;

    expect(isMissingRequiredFields(hitWithUndefinedSource)).toBe(true);
  });

  it('returns true if @timestamp is missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit(['@timestamp'], hit._source) as typeof hit._source,
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_ALERT_IDS is not an array', () => {
    const hit = getHit();
    if (hit._source) {
      // @ts-expect-error: testing invalid type
      hit._source[ALERT_ATTACK_DISCOVERY_ALERT_IDS] = undefined;
    }

    expect(isMissingRequiredFields(hit as typeof hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_ALERT_IDS is not an array (string)', () => {
    const hit = getHit();
    if (hit._source) {
      // @ts-expect-error: testing invalid type
      hit._source[ALERT_ATTACK_DISCOVERY_ALERT_IDS] = 'not-an-array';
    }

    expect(isMissingRequiredFields(hit as typeof hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_API_CONFIG is missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_ATTACK_DISCOVERY_API_CONFIG], hit._source) as typeof hit._source,
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_API_CONFIG.action_type_id is missing', () => {
    let hit = getHit();
    if (hit._source && hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]) {
      hit = {
        ...hit,
        _source: {
          ...hit._source,
          [ALERT_ATTACK_DISCOVERY_API_CONFIG]: omit(
            ['action_type_id'],
            hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]
          ) as (typeof hit._source)[typeof ALERT_ATTACK_DISCOVERY_API_CONFIG],
        },
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_API_CONFIG.connector_id is missing', () => {
    let hit = getHit();
    if (hit._source && hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]) {
      hit = {
        ...hit,
        _source: {
          ...hit._source,
          [ALERT_ATTACK_DISCOVERY_API_CONFIG]: omit(
            ['connector_id'],
            hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]
          ) as (typeof hit._source)[typeof ALERT_ATTACK_DISCOVERY_API_CONFIG],
        },
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_API_CONFIG.name is missing', () => {
    let hit = getHit();
    if (hit._source && hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]) {
      hit = {
        ...hit,
        _source: {
          ...hit._source,
          [ALERT_ATTACK_DISCOVERY_API_CONFIG]: omit(
            ['name'],
            hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]
          ) as (typeof hit._source)[typeof ALERT_ATTACK_DISCOVERY_API_CONFIG],
        },
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN is missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN], hit._source) as typeof hit._source,
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_RULE_EXECUTION_UUID is missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_RULE_EXECUTION_UUID], hit._source) as typeof hit._source,
      };
    }
    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if _id is missing', () => {
    let hit = getHit();
    hit = omit(['_id'], hit) as typeof hit;

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN is missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN], hit._source) as typeof hit._source,
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_TITLE is missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_ATTACK_DISCOVERY_TITLE], hit._source) as typeof hit._source,
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });
});

describe('getMissingFields', () => {
  const getHit = () => {
    const mock = getResponseMock();

    const hit = mock.hits.hits[0];
    return {
      ...hit,
      _source: hit._source ? { ...hit._source } : hit._source,
    };
  };

  it('returns empty array for a valid document', () => {
    const hit = getHit();

    const result = getMissingFields(hit);

    expect(result).toEqual([]);
  });

  it('returns _source when _source is null', () => {
    const hit = getHit();
    const hitWithUndefinedSource = { ...hit };
    delete hitWithUndefinedSource._source;

    const result = getMissingFields(hitWithUndefinedSource);

    expect(result).toEqual(['_source']);
  });

  it('returns @timestamp when missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit(['@timestamp'], hit._source) as typeof hit._source,
      };
    }

    const result = getMissingFields(hit);

    expect(result).toContain('@timestamp');
  });

  it('returns _id when missing', () => {
    let hit = getHit();
    hit = omit(['_id'], hit) as typeof hit;

    const result = getMissingFields(hit);

    expect(result).toContain('_id');
  });

  it('returns ALERT_ATTACK_DISCOVERY_ALERT_IDS when not an array', () => {
    const hit = getHit();
    if (hit._source) {
      // @ts-expect-error: testing invalid type
      hit._source[ALERT_ATTACK_DISCOVERY_ALERT_IDS] = 'not-an-array';
    }

    const result = getMissingFields(hit);

    expect(result).toContain(`${ALERT_ATTACK_DISCOVERY_ALERT_IDS} (not an array)`);
  });

  it('returns ALERT_ATTACK_DISCOVERY_API_CONFIG when missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_ATTACK_DISCOVERY_API_CONFIG], hit._source) as typeof hit._source,
      };
    }

    const result = getMissingFields(hit);

    expect(result).toContain(ALERT_ATTACK_DISCOVERY_API_CONFIG);
  });

  it('returns api_config.action_type_id when missing', () => {
    let hit = getHit();
    if (hit._source && hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]) {
      hit = {
        ...hit,
        _source: {
          ...hit._source,
          [ALERT_ATTACK_DISCOVERY_API_CONFIG]: omit(
            ['action_type_id'],
            hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]
          ) as (typeof hit._source)[typeof ALERT_ATTACK_DISCOVERY_API_CONFIG],
        },
      };
    }

    const result = getMissingFields(hit);

    expect(result).toContain(`${ALERT_ATTACK_DISCOVERY_API_CONFIG}.action_type_id`);
  });

  it('returns api_config.connector_id when missing', () => {
    let hit = getHit();
    if (hit._source && hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]) {
      hit = {
        ...hit,
        _source: {
          ...hit._source,
          [ALERT_ATTACK_DISCOVERY_API_CONFIG]: omit(
            ['connector_id'],
            hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]
          ) as (typeof hit._source)[typeof ALERT_ATTACK_DISCOVERY_API_CONFIG],
        },
      };
    }

    const result = getMissingFields(hit);

    expect(result).toContain(`${ALERT_ATTACK_DISCOVERY_API_CONFIG}.connector_id`);
  });

  it('returns api_config.name when missing', () => {
    let hit = getHit();
    if (hit._source && hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]) {
      hit = {
        ...hit,
        _source: {
          ...hit._source,
          [ALERT_ATTACK_DISCOVERY_API_CONFIG]: omit(
            ['name'],
            hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]
          ) as (typeof hit._source)[typeof ALERT_ATTACK_DISCOVERY_API_CONFIG],
        },
      };
    }

    const result = getMissingFields(hit);

    expect(result).toContain(`${ALERT_ATTACK_DISCOVERY_API_CONFIG}.name`);
  });

  it('returns ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN when missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN], hit._source) as typeof hit._source,
      };
    }

    const result = getMissingFields(hit);

    expect(result).toContain(ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN);
  });

  it('returns ALERT_RULE_EXECUTION_UUID when missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_RULE_EXECUTION_UUID], hit._source) as typeof hit._source,
      };
    }

    const result = getMissingFields(hit);

    expect(result).toContain(ALERT_RULE_EXECUTION_UUID);
  });

  it('returns ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN when missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN], hit._source) as typeof hit._source,
      };
    }

    const result = getMissingFields(hit);

    expect(result).toContain(ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN);
  });

  it('returns ALERT_ATTACK_DISCOVERY_TITLE when missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_ATTACK_DISCOVERY_TITLE], hit._source) as typeof hit._source,
      };
    }

    const result = getMissingFields(hit);

    expect(result).toContain(ALERT_ATTACK_DISCOVERY_TITLE);
  });

  it('returns multiple missing fields', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit(
          ['@timestamp', ALERT_RULE_EXECUTION_UUID, ALERT_ATTACK_DISCOVERY_TITLE],
          hit._source
        ) as typeof hit._source,
      };
    }

    const result = getMissingFields(hit);

    expect(result).toHaveLength(3);
    expect(result).toContain('@timestamp');
    expect(result).toContain(ALERT_RULE_EXECUTION_UUID);
    expect(result).toContain(ALERT_ATTACK_DISCOVERY_TITLE);
  });
});
