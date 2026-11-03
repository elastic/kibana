/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InboundEventAdmissionConfig } from '../actions_config';
import { InboundEventAdmission } from './inbound_event_admission';

const config = (
  overrides: Partial<InboundEventAdmissionConfig> = {}
): InboundEventAdmissionConfig => ({
  enabled: true,
  maxInFlight: 2,
  maxInFlightPerConnector: 1,
  ...overrides,
});

describe('InboundEventAdmission', () => {
  it('holds the slot until release', () => {
    const admission = new InboundEventAdmission(
      config({ maxInFlight: 2, maxInFlightPerConnector: 1 })
    );
    const first = admission.tryAdmit('a');
    expect(first.allowed).toBe(true);
    expect(admission.tryAdmit('a')).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
      scope: 'connector',
    });
    if (first.allowed) {
      first.release();
    }
    expect(admission.tryAdmit('a').allowed).toBe(true);
  });

  it('denies a new key when the process cap is full and does not keep that key', () => {
    const admission = new InboundEventAdmission(
      config({ maxInFlight: 1, maxInFlightPerConnector: 1 })
    );
    const held = admission.tryAdmit('a');
    expect(admission.tryAdmit('b')).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
      scope: 'process',
    });

    if (held.allowed) {
      held.release();
    }
    expect(admission.tryAdmit('b')).toEqual(expect.objectContaining({ allowed: true }));
  });

  it('denies one connector at its cap and still admits a different connector', () => {
    const admission = new InboundEventAdmission(
      config({ maxInFlight: 2, maxInFlightPerConnector: 1 })
    );
    expect(admission.tryAdmit('a').allowed).toBe(true);
    expect(admission.tryAdmit('a')).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
      scope: 'connector',
    });
    expect(admission.tryAdmit('b').allowed).toBe(true);
  });

  it('frees both counts on release and ignores a second release', () => {
    const admission = new InboundEventAdmission(
      config({ maxInFlight: 1, maxInFlightPerConnector: 1 })
    );
    const admitted = admission.tryAdmit('a');
    expect(admitted.allowed).toBe(true);
    if (!admitted.allowed) {
      return;
    }
    admitted.release();
    admitted.release();

    const again = admission.tryAdmit('a');
    expect(again.allowed).toBe(true);
    expect(admission.tryAdmit('b')).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
      scope: 'process',
    });
  });

  it('never denies and stores nothing when disabled', () => {
    const admission = new InboundEventAdmission(
      config({ enabled: false, maxInFlight: 1, maxInFlightPerConnector: 1 })
    );
    expect(admission.tryAdmit('a').allowed).toBe(true);
    expect(admission.tryAdmit('b').allowed).toBe(true);
  });
});
