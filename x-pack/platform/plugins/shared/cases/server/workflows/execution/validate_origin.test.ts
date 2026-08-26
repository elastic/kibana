/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentResponse } from '../../../common/types/api';
import type { Case } from '../../../common/types/domain';
import { getAlertInfoFromComments } from '../../common/utils';
import {
  validateOrigin as validateOriginWithAttachments,
  validateMultiCaseOrigin,
} from './validate_origin';

const theCase = {
  id: 'case-1',
  observables: [] as Array<{ id: string }>,
  comments: [] as unknown[],
} as unknown as Case;

const validateOrigin = (
  params: Omit<Parameters<typeof validateOriginWithAttachments>[0], 'attachedAlerts'>
): void => {
  const attachedAlerts: DocumentResponse = getAlertInfoFromComments(params.theCase.comments).map(
    ({ id, index }) => ({
      id,
      index,
      attached_at: '2026-08-26T00:00:00.000Z',
    })
  );
  validateOriginWithAttachments({
    ...params,
    attachedAlerts,
  });
};

// ── cases.case origin ─────────────────────────────────────────────────────────

describe('cases.case origin', () => {
  it('passes when origin id matches case id and no alert inputs are present', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.case', id: 'case-1' },
        caseId: 'case-1',
        inputs: {},
        theCase,
      })
    ).not.toThrow();
  });

  it('throws when origin id does not match case id', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.case', id: 'case-2' },
        caseId: 'case-1',
        inputs: {},
        theCase,
      })
    ).toThrow('Workflow origin id must match case id "case-1".');
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
        origin: { type: 'cases.case', id: 'case-1' },
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
        origin: { type: 'cases.case', id: 'case-1' },
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

  it('passes when observable belongs to the case', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.observable', id: 'obs-1' },
        caseId: 'case-1',
        inputs: {},
        theCase: caseWithObs,
      })
    ).not.toThrow();
  });

  it('throws when observable does not belong to the case', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.observable', id: 'obs-99' },
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
        origin: { type: 'cases.observable', id: 'obs-1' },
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

  it('throws when no alertIds are provided', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alert', id: 'alert-1' },
        caseId: 'case-1',
        inputs: {},
        theCase: caseWithAlerts,
      })
    ).toThrow('Alert workflow origins require at least one selected alert.');
  });

  it('throws when a selected alert is not attached', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alert', id: 'alert-99' },
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
        origin: { type: 'cases.alert', id: 'alert-1' },
        caseId: 'case-1',
        inputs: { event: { alertIds: [{ _id: 'alert-1', _index: '.alerts-wrong-index' }] } },
        theCase: caseWithAlerts,
      })
    ).toThrow('All selected alerts must belong to the case.');
  });

  it('throws when origin alert id is not among the selected alerts', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alert', id: 'alert-2' },
        caseId: 'case-1',
        inputs: { event: { alertIds: [{ _id: 'alert-1', _index: '.alerts' }] } },
        theCase: caseWithAlerts,
      })
    ).toThrow('Alert workflow origin "alert-2" is not selected.');
  });

  it('passes when the selected alert is attached and matches the origin id', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alert', id: 'alert-1' },
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

  it('throws when origin id does not match case id', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alerts', id: 'case-2' },
        caseId: 'case-1',
        inputs: {},
        theCase: caseWithAlerts,
      })
    ).toThrow('Workflow origin id must match case id "case-1".');
  });

  it('throws when no alertIds are provided', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alerts', id: 'case-1' },
        caseId: 'case-1',
        inputs: {},
        theCase: caseWithAlerts,
      })
    ).toThrow('Alert workflow origins require at least one selected alert.');
  });

  it('passes when all selected alerts are attached', () => {
    expect(() =>
      validateOrigin({
        origin: { type: 'cases.alerts', id: 'case-1' },
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
        origin: { type: 'cases.alert', id: 'alert-unified-1' },
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
        origin: { type: 'cases.alert', id: 'alert-unified-1' },
        caseId: 'case-1',
        inputs: {
          event: { alertIds: [{ _id: 'alert-unified-1', _index: '.alerts-wrong' }] },
        },
        theCase: caseWithUnifiedAlert,
      })
    ).toThrow('All selected alerts must belong to the case.');
  });
});

describe('validateMultiCaseOrigin', () => {
  const caseIds = ['case-a', 'case-b', 'case-c'];
  const origin = { type: 'cases.case' as const, id: 'case-a' };

  it('accepts a valid multi-case run with a cases.case origin whose id is in caseIds', () => {
    expect(() => validateMultiCaseOrigin({ origin, caseIds, inputs: {} })).not.toThrow();
  });

  it('rejects cases.observable origin type for multi-case runs', () => {
    expect(() =>
      validateMultiCaseOrigin({
        origin: { type: 'cases.observable', id: 'obs-1' },
        caseIds,
        inputs: {},
      })
    ).toThrow('can only be used with a single case');
  });

  it('rejects cases.alert origin type for multi-case runs', () => {
    expect(() =>
      validateMultiCaseOrigin({
        origin: { type: 'cases.alert', id: 'alert-1' },
        caseIds,
        inputs: {},
      })
    ).toThrow('can only be used with a single case');
  });

  it('rejects cases.alerts origin type for multi-case runs', () => {
    expect(() =>
      validateMultiCaseOrigin({
        origin: { type: 'cases.alerts', id: 'case-a' },
        caseIds,
        inputs: {},
      })
    ).toThrow('can only be used with a single case');
  });

  it('rejects origin.id that is not in caseIds', () => {
    expect(() =>
      validateMultiCaseOrigin({
        origin: { type: 'cases.case', id: 'not-in-list' },
        caseIds,
        inputs: {},
      })
    ).toThrow('Workflow origin id must be one of the requested case ids.');
  });

  it('rejects inputs containing alertIds for multi-case runs', () => {
    expect(() =>
      validateMultiCaseOrigin({
        origin,
        caseIds,
        inputs: {
          event: { alertIds: [{ _id: 'alert-1', _index: '.alerts-index' }] },
        },
      })
    ).toThrow('Alert inputs can only be used with a single case.');
  });
});
