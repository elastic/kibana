/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentResponse } from '../../../common/types/api';
import type { Case } from '../../../common/types/domain';
import { getAlertInfoFromComments } from '../../common/utils';
import { parseSelectedAlertPairs, validateOrigin as validateOriginWithAttachments } from './validate_origin';

const theCase = {
  id: 'case-1',
  observables: [] as Array<{ id: string }>,
  comments: [] as unknown[],
} as unknown as Case;

/**
 * Test wrapper: derives `attachedAlerts` from the case comments (mirroring the source used in
 * production for the legacy alert attachment shape) and parses `inputs` through
 * `parseSelectedAlertPairs` — the same code path the service uses — so the validated set is
 * identical to what alert preprocessing later fetches.
 */
const validateOrigin = (
  params: Omit<Parameters<typeof validateOriginWithAttachments>[0], 'attachedAlerts' | 'selectedAlerts'> & {
    inputs: Record<string, unknown>;
  }
): void => {
  const attachedAlerts: DocumentResponse = getAlertInfoFromComments(params.theCase.comments).map(
    ({ id, index }) => ({
      id,
      index,
      attached_at: '2026-08-26T00:00:00.000Z',
    })
  );
  const selectedAlerts = parseSelectedAlertPairs(params.inputs);
  const { inputs: _inputs, ...rest } = params;
  validateOriginWithAttachments({
    ...rest,
    selectedAlerts,
    attachedAlerts,
  });
};

// ── cases.case origin ─────────────────────────────────────────────────────────

describe('cases.case origin', () => {
  it('passes when caseId matches and no alert inputs are present', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.case', caseId: 'case-1' },
        caseId: 'case-1',
        inputs: {},
        theCase,
      })
    ).not.toThrow();
  });

  it('throws when caseId does not match the target case', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.case', caseId: 'case-2' },
        caseId: 'case-1',
        inputs: {},
        theCase,
      })
    ).toThrow('Workflow origin caseId must match case id "case-1".');
  });

  it('throws when alertIds are present but not attached to the case', () => {
    // Ensures a cases.case origin cannot bypass the alert-membership check
    // and inject arbitrary alert documents into the workflow.
    const caseWithAlert = {
      ...theCase,
      comments: [{ type: 'alert', alertId: 'attached-alert', index: '.alerts' }],
    } as unknown as Case;

    expect(() =>
      validateOrigin({
        origin: { type: 'cases.case', caseId: 'case-1' },
        caseId: 'case-1',
        inputs: { event: { alertIds: [{ _id: 'unattached-alert', _index: '.alerts' }] } },
        theCase: caseWithAlert,
      })
    ).toThrow('All selected alerts must belong to the case.');
  });

  it('passes when all alertIds are attached', () => {
    const caseWithAlert = {
      ...theCase,
      comments: [{ type: 'alert', alertId: 'alert-1', index: '.alerts' }],
    } as unknown as Case;

    expect(() =>
      validateOrigin({
        origin: { type: 'cases.case', caseId: 'case-1' },
        caseId: 'case-1',
        inputs: { event: { alertIds: [{ _id: 'alert-1', _index: '.alerts' }] } },
        theCase: caseWithAlert,
      })
    ).not.toThrow();
  });
});

// ── cases.observable origin ───────────────────────────────────────────────────

describe('cases.observable origin', () => {
  const caseWithObs = {
    ...theCase,
    observables: [{ id: 'obs-1' }],
  } as unknown as Case;

  it('passes when observable belongs to the case and caseId matches', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.observable', caseId: 'case-1', observableId: 'obs-1' },
        caseId: 'case-1',
        inputs: {},
        theCase: caseWithObs,
      })
    ).not.toThrow();
  });

  it('throws when caseId does not match', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.observable', caseId: 'case-2', observableId: 'obs-1' },
        caseId: 'case-1',
        inputs: {},
        theCase: caseWithObs,
      })
    ).toThrow('Workflow origin caseId must match case id "case-1".');
  });

  it('throws when observable does not belong to the case', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.observable', caseId: 'case-1', observableId: 'obs-99' },
        caseId: 'case-1',
        inputs: {},
        theCase: caseWithObs,
      })
    ).toThrow('Observable "obs-99" does not belong to case "case-1".');
  });

  it('throws when alertIds are present but not attached (alert bypass via observable origin)', () => {
    const caseWithBoth = {
      ...caseWithObs,
      comments: [{ type: 'alert', alertId: 'attached-alert', index: '.alerts' }],
    } as unknown as Case;

    expect(() =>
      validateOrigin({
        origin: { type: 'cases.observable', caseId: 'case-1', observableId: 'obs-1' },
        caseId: 'case-1',
        inputs: { event: { alertIds: [{ _id: 'unattached-alert', _index: '.alerts' }] } },
        theCase: caseWithBoth,
      })
    ).toThrow('All selected alerts must belong to the case.');
  });
});

// ── cases.alert origin ────────────────────────────────────────────────────────

describe('cases.alert origin', () => {
  const caseWithAlerts = {
    ...theCase,
    comments: [
      { type: 'alert', alertId: 'alert-1', index: '.alerts' },
      { type: 'alert', alertId: 'alert-2', index: '.alerts' },
    ],
  } as unknown as Case;

  it('throws when caseId does not match', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alert', caseId: 'case-2', alertId: 'alert-1' },
        caseId: 'case-1',
        inputs: { event: { alertIds: [{ _id: 'alert-1', _index: '.alerts' }] } },
        theCase: caseWithAlerts,
      })
    ).toThrow('Workflow origin caseId must match case id "case-1".');
  });

  it('throws when no alertIds are provided', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alert', caseId: 'case-1', alertId: 'alert-1' },
        caseId: 'case-1',
        inputs: {},
        theCase: caseWithAlerts,
      })
    ).toThrow('Alert workflow origins require at least one selected alert.');
  });

  it('throws when a selected alert is not attached', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alert', caseId: 'case-1', alertId: 'alert-99' },
        caseId: 'case-1',
        inputs: { event: { alertIds: [{ _id: 'alert-99', _index: '.alerts' }] } },
        theCase: caseWithAlerts,
      })
    ).toThrow('All selected alerts must belong to the case.');
  });

  it('throws when alert id matches but index does not', () => {
    // Validates that (id, index) pairs are compared — not just ids.
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alert', caseId: 'case-1', alertId: 'alert-1' },
        caseId: 'case-1',
        inputs: { event: { alertIds: [{ _id: 'alert-1', _index: '.alerts-wrong-index' }] } },
        theCase: caseWithAlerts,
      })
    ).toThrow('All selected alerts must belong to the case.');
  });

  it('throws when origin alertId is not among the selected alerts', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alert', caseId: 'case-1', alertId: 'alert-2' },
        caseId: 'case-1',
        inputs: { event: { alertIds: [{ _id: 'alert-1', _index: '.alerts' }] } },
        theCase: caseWithAlerts,
      })
    ).toThrow('Alert workflow origin "alert-2" is not selected.');
  });

  it('passes when the selected alert is attached and matches the origin alertId', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alert', caseId: 'case-1', alertId: 'alert-1' },
        caseId: 'case-1',
        inputs: { event: { alertIds: [{ _id: 'alert-1', _index: '.alerts' }] } },
        theCase: caseWithAlerts,
      })
    ).not.toThrow();
  });
});

// ── cases.alerts origin ───────────────────────────────────────────────────────

describe('cases.alerts origin', () => {
  const caseWithAlerts = {
    ...theCase,
    comments: [
      { type: 'alert', alertId: 'alert-1', index: '.alerts' },
      { type: 'alert', alertId: 'alert-2', index: '.alerts' },
    ],
  } as unknown as Case;

  it('throws when caseId does not match', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alerts', caseId: 'case-2' },
        caseId: 'case-1',
        inputs: {},
        theCase: caseWithAlerts,
      })
    ).toThrow('Workflow origin caseId must match case id "case-1".');
  });

  it('throws when no alertIds are provided', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alerts', caseId: 'case-1' },
        caseId: 'case-1',
        inputs: {},
        theCase: caseWithAlerts,
      })
    ).toThrow('Alert workflow origins require at least one selected alert.');
  });

  it('passes when all selected alerts are attached', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alerts', caseId: 'case-1' },
        caseId: 'case-1',
        inputs: {
          event: {
            alertIds: [
              { _id: 'alert-1', _index: '.alerts' },
              { _id: 'alert-2', _index: '.alerts' },
            ],
          },
        },
        theCase: caseWithAlerts,
      })
    ).not.toThrow();
  });
});

// ── unified (v2) alert attachment shape ───────────────────────────────────────

describe('unified v2 alert attachment', () => {
  // The unified observability alert type string as defined by the Cases constants.
  const OBSERVABILITY_ALERT_TYPE = 'observability.alert';

  it('matches alerts using attachmentId and metadata.index', () => {
    const caseWithUnifiedAlert = {
      ...theCase,
      comments: [
        {
          type: OBSERVABILITY_ALERT_TYPE,
          attachmentId: 'alert-unified-1',
          metadata: { index: '.alerts-observability' },
        },
      ],
    } as unknown as Case;

    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alert', caseId: 'case-1', alertId: 'alert-unified-1' },
        caseId: 'case-1',
        inputs: {
          event: { alertIds: [{ _id: 'alert-unified-1', _index: '.alerts-observability' }] },
        },
        theCase: caseWithUnifiedAlert,
      })
    ).not.toThrow();
  });

  it('throws when the unified alert index does not match', () => {
    const caseWithUnifiedAlert = {
      ...theCase,
      comments: [
        {
          type: OBSERVABILITY_ALERT_TYPE,
          attachmentId: 'alert-unified-1',
          metadata: { index: '.alerts-observability' },
        },
      ],
    } as unknown as Case;

    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alert', caseId: 'case-1', alertId: 'alert-unified-1' },
        caseId: 'case-1',
        inputs: {
          event: { alertIds: [{ _id: 'alert-unified-1', _index: '.alerts-wrong' }] },
        },
        theCase: caseWithUnifiedAlert,
      })
    ).toThrow('All selected alerts must belong to the case.');
  });
});

// ── parseSelectedAlertPairs input validation ──────────────────────────────────

describe('parseSelectedAlertPairs', () => {
  it('returns empty array when inputs.event.alertIds is absent', () => {
    expect(parseSelectedAlertPairs({})).toEqual([]);
    expect(parseSelectedAlertPairs({ event: {} })).toEqual([]);
    expect(parseSelectedAlertPairs({ event: { alertIds: null } })).toEqual([]);
    expect(parseSelectedAlertPairs({ event: { alertIds: undefined } })).toEqual([]);
  });

  it('throws 400 when alertIds is not an array', () => {
    expect(() =>
      parseSelectedAlertPairs({ event: { alertIds: 'alert-1' } })
    ).toThrow('inputs.event.alertIds must be an array.');
    expect(() =>
      parseSelectedAlertPairs({ event: { alertIds: 42 } })
    ).toThrow('inputs.event.alertIds must be an array.');
  });

  it('throws 400 when an entry has a non-string _id', () => {
    expect(() =>
      parseSelectedAlertPairs({ event: { alertIds: [{ _id: 4242, _index: '.alerts' }] } })
    ).toThrow('Every inputs.event.alertIds entry must be an object with string "_id" and "_index" properties.');
  });

  it('throws 400 when an entry has a non-string _index', () => {
    expect(() =>
      parseSelectedAlertPairs({ event: { alertIds: [{ _id: 'alert-1', _index: 99 }] } })
    ).toThrow('Every inputs.event.alertIds entry must be an object with string "_id" and "_index" properties.');
  });

  it('throws 400 when an entry is not an object', () => {
    expect(() =>
      parseSelectedAlertPairs({ event: { alertIds: ['alert-1'] } })
    ).toThrow('Every inputs.event.alertIds entry must be an object with string "_id" and "_index" properties.');
  });

  it(`throws 400 when alertIds exceeds MAX_ALERTS_PER_CASE entries`, () => {
    const oversized = Array.from({ length: 1001 }, (_, i) => ({
      _id: `alert-${i}`,
      _index: '.alerts',
    }));
    expect(() =>
      parseSelectedAlertPairs({ event: { alertIds: oversized } })
    ).toThrow(/cannot contain more than/);
  });

  it('returns the correct pairs for a valid array', () => {
    expect(
      parseSelectedAlertPairs({
        event: { alertIds: [{ _id: 'alert-1', _index: '.alerts-a' }, { _id: 'alert-2', _index: '.alerts-b' }] },
      })
    ).toEqual([
      { _id: 'alert-1', _index: '.alerts-a' },
      { _id: 'alert-2', _index: '.alerts-b' },
    ]);
  });
});
