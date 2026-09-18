/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventsWriteBulkHandler, eventsWriteHandler, type EventsWriteInput } from './handler';
import type {
  SignificantEvent,
  SignalEntry,
  BlastRadiusEntry,
  CausalFeature,
} from '@kbn/significant-events-schema';
import {
  MAX_ASSESSMENT_NOTE_LENGTH,
  MAX_SIGNAL_DESCRIPTION_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_SYMPTOM_HYPOTHESIS_LENGTH,
} from '@kbn/significant-events-schema';
import { eventsWriteItemSchema } from './tool';
import type { EventClient } from '../../../lib/significant_events/events';

const TS_EARLIER = '2024-01-01T00:00:00.000Z';

const baseInput: EventsWriteInput = {
  status: 'open',
  stream_names: ['logs.checkout'],
  title: 'Checkout latency',
  symptom_hypothesis: 'Checkout requests are delayed because the payment dependency is timing out.',
  summary: 'P99 latency breached SLO',
  severity: '60-high',
  confidence: 0.82,
  assessment_note: 'Verified via execute_esql',
  signals: [],
  causal_features: [],
  blast_radius: [],
};

const successfulBulkCreate = async (documents: object[]) => ({
  errors: false,
  items: documents.map(() => ({ create: { status: 201, result: 'created' } })),
});

/** Returns a minimal stored SignificantEvent with sensible defaults. */
const makeStoredEvent = (
  eventId: string,
  overrides: Partial<SignificantEvent> = {}
): SignificantEvent =>
  ({
    '@timestamp': TS_EARLIER,
    event_uuid: `${eventId}-uuid`,
    event_id: eventId,
    status: 'open',
    severity: '60-high',
    stream_names: ['logs.checkout'],
    signals: [],
    title: 'Test event',
    symptom_hypothesis: 'Test hypothesis',
    summary: 'Test summary',
    confidence: 0.8,
    ...overrides,
  } as SignificantEvent);

/**
 * Returns a typed eventClient mock with default no-op implementations.
 * Override individual methods by passing a partial mock.
 */
const makeEventClient = (
  overrides: Partial<jest.Mocked<EventClient>> = {}
): jest.Mocked<EventClient> =>
  ({
    findLatestActive: jest.fn().mockResolvedValue({ hits: [] }),
    findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
    findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
    bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    emitTrigger: jest.fn(),
    ...overrides,
  } as jest.Mocked<EventClient>);

describe('eventsWriteHandler', () => {
  it('writes a new event', async () => {
    const eventClient = makeEventClient();

    const result = await eventsWriteHandler({
      eventClient,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345' },
    });

    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(eventClient.bulkCreate.mock.calls[0][0][0].symptom_hypothesis).toBe(
      baseInput.symptom_hypothesis
    );
    expect(result.written).toBe(true);
    if (result.written) {
      expect(result.event_id).toBe('checkout__latency-abc12345');
      expect(result.status).toBe('open');
      expect(typeof result.event_uuid).toBe('string');
    }
  });

  it('skips latest-version lookup when event_id is absent', async () => {
    const findLatestByEventIds = jest.fn();
    const findByEventId = jest.fn();
    const eventClient = makeEventClient({
      findLatestByEventIds,
      findByEventId,
    });

    const result = await eventsWriteHandler({
      eventClient,
      input: { ...baseInput },
    });

    expect(findLatestByEventIds).not.toHaveBeenCalled();
    expect(findByEventId).not.toHaveBeenCalled();
    expect(result.written).toBe(true);
    if (result.written) {
      expect(result.event_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    }
  });

  it('treats an empty event_id as absent and generates a synthetic ID', async () => {
    const findLatestByEventIds = jest.fn();
    const bulkCreate = jest.fn().mockImplementation(successfulBulkCreate);
    const eventClient = makeEventClient({ findLatestByEventIds, bulkCreate });

    const result = await eventsWriteHandler({
      eventClient,
      input: { ...baseInput, event_id: '' },
    });

    expect(findLatestByEventIds).not.toHaveBeenCalled();
    if (result.written) {
      expect(bulkCreate.mock.calls[0][0][0].event_id).toBe(result.event_id);
    }
  });

  it('sets previous_event_uuid from the latest event in the stored lineage', async () => {
    const stored = makeStoredEvent('checkout__latency-abc12345', {
      event_uuid: 'latest-id',
      status: 'closed',
    });
    const eventClient = makeEventClient({
      findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
    });

    const result = await eventsWriteHandler({
      eventClient,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345', status: 'open' },
    });

    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(eventClient.bulkCreate.mock.calls[0][0][0].previous_event_uuid).toBe('latest-id');
    expect(result.written).toBe(true);
  });

  it('writes with refresh wait_for so an immediate discovery _count can see the event', async () => {
    const eventClient = makeEventClient();

    await eventsWriteHandler({
      eventClient,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345' },
    });

    expect(eventClient.bulkCreate.mock.calls[0][1]).toEqual({
      throwOnFail: false,
      refresh: 'wait_for',
    });
  });

  // status: 'closed' on the stored event ensures severity+status differ from the input ('open'),
  // so the no-op guard does not fire and a write reaches bulkCreate in both cases.
  it.each([
    [
      'carries investigations lineage forward when present',
      [
        { workflow_execution_id: 'wf-1', started_at: '2024-01-01T00:00:00.000Z' },
      ] as SignificantEvent['investigations'],
    ],
    ['leaves investigations undefined when absent', undefined],
  ])('%s on re-open continuation', async (_, storedInvestigations) => {
    const stored = makeStoredEvent('checkout__latency-abc12345', {
      event_uuid: 'latest-id',
      status: 'closed',
      investigations: storedInvestigations,
    });
    const eventClient = makeEventClient({
      findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
    });

    await eventsWriteHandler({
      eventClient,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345' },
    });

    expect(eventClient.bulkCreate.mock.calls[0][0][0].investigations).toEqual(storedInvestigations);
  });

  describe('unchanged_outcome (no-op guard)', () => {
    it('returns EventsWriteNoOpResult when severity and status are unchanged for a snapshot candidate', async () => {
      const stored = makeStoredEvent('checkout-stable');
      const eventClient = makeEventClient({
        findLatestByEventIds: jest.fn().mockResolvedValue(new Map([['checkout-stable', stored]])),
        findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
        bulkCreate: jest.fn(),
      });

      const result = await eventsWriteHandler({
        eventClient,
        input: { ...baseInput, event_id: 'checkout-stable', status: 'open', severity: '60-high' },
      });

      expect(result.written).toBe(false);
      if (!result.written) {
        expect(result.reason).toBe('unchanged_outcome');
        expect(result.event_id).toBe('checkout-stable');
        expect(result.skipped).toBe(true);
      }
      expect(eventClient.bulkCreate).not.toHaveBeenCalled();
      expect(eventClient.findByEventId).toHaveBeenCalledWith('checkout-stable');
    });

    it('writes when an unchanged snapshot adds a detection rule not present in its history', async () => {
      const ruleOne: SignalEntry = {
        type: 'detection',
        stream_name: 'logs.checkout',
        description: 'Rule one detected an issue',
        verdict: 'confirms',
        metadata: {
          detection_id: 'det-rule-1',
          rule_uuid: 'rule-1',
          change_point_type: 'spike',
          p_value: 0.01,
        },
      };
      const ruleTwo: SignalEntry = {
        type: 'detection',
        stream_name: 'logs.checkout',
        description: 'Rule two detected an issue',
        verdict: 'confirms',
        metadata: {
          detection_id: 'det-rule-2',
          rule_uuid: 'rule-2',
          change_point_type: 'spike',
          p_value: 0.01,
        },
      };
      const stored = makeStoredEvent('checkout-stable', {
        signals: [ruleOne],
      });
      const eventClient = makeEventClient({
        findLatestByEventIds: jest.fn().mockResolvedValue(new Map([['checkout-stable', stored]])),
        findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
        bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
      });

      const result = await eventsWriteHandler({
        eventClient,
        input: {
          ...baseInput,
          event_id: 'checkout-stable',
          status: 'open',
          severity: '60-high',
          signals: [ruleTwo],
        },
      });

      expect(result.written).toBe(true);
      expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(eventClient.bulkCreate.mock.calls[0][0][0].signals).toEqual(
        expect.arrayContaining([ruleOne, ruleTwo])
      );
    });

    it('skips when an unchanged snapshot resubmits a rule absent from the latest version', async () => {
      const ruleOne: SignalEntry = {
        type: 'detection',
        stream_name: 'logs.checkout',
        description: 'Rule one detected an issue',
        verdict: 'confirms',
        metadata: {
          detection_id: 'det-rule-1',
          rule_uuid: 'rule-1',
          change_point_type: 'spike',
          p_value: 0.01,
        },
      };
      const latest = makeStoredEvent('checkout-stable');
      const eventClient = makeEventClient({
        findLatestByEventIds: jest.fn().mockResolvedValue(new Map([['checkout-stable', latest]])),
        findByEventId: jest.fn().mockResolvedValue({
          hits: [makeStoredEvent('checkout-stable', { signals: [ruleOne] }), latest],
        }),
        bulkCreate: jest.fn(),
      });

      const result = await eventsWriteHandler({
        eventClient,
        input: {
          ...baseInput,
          event_id: 'checkout-stable',
          status: 'open',
          severity: '60-high',
          signals: [ruleOne],
        },
      });

      expect(result).toMatchObject({ written: false, reason: 'unchanged_outcome' });
      expect(eventClient.bulkCreate).not.toHaveBeenCalled();
    });

    it('throws when the bulk result is existing_active_event (wrapper does not swallow skips)', async () => {
      const eventClient = makeEventClient({
        findLatestActive: jest.fn().mockResolvedValue({
          hits: [makeStoredEvent('existing-event-id')],
        }),
      });

      // No event_id → find-or-create; the active event match returns existing_active_event,
      // which the single-item wrapper must throw rather than silently return.
      await expect(
        eventsWriteHandler({ eventClient, input: { ...baseInput } })
      ).rejects.toMatchObject({ code: 'outcome_unknown' });
    });
  });
});

describe('eventsWriteBulkHandler', () => {
  it('writes unique event ids with one lineage lookup per event and one bulk request', async () => {
    const eventClient = makeEventClient();

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [
        { ...baseInput, event_id: 'event-1' },
        { ...baseInput, event_id: 'event-2', status: 'closed' },
      ],
    });

    expect(eventClient.findByEventId).toHaveBeenCalledTimes(2);
    expect(eventClient.findByEventId).toHaveBeenCalledWith('event-1');
    expect(eventClient.findByEventId).toHaveBeenCalledWith('event-2');
    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(eventClient.bulkCreate.mock.calls[0][0]).toHaveLength(2);
    expect(results).toEqual([
      expect.objectContaining({ index: 0, event_id: 'event-1', written: true }),
      expect.objectContaining({ index: 1, event_id: 'event-2', written: true }),
    ]);
  });

  it('returns aligned per-item bulk failures', async () => {
    const eventClient = makeEventClient({
      bulkCreate: jest.fn().mockResolvedValue({
        errors: true,
        items: [
          { create: { status: 201, result: 'created' } },
          {
            create: {
              status: 400,
              error: { type: 'mapper_parsing_exception', reason: 'bad field' },
            },
          },
        ],
      }),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [
        { ...baseInput, event_id: 'event-1' },
        { ...baseInput, event_id: 'event-2' },
      ],
    });

    expect(results[0]).toEqual(expect.objectContaining({ index: 0, written: true }));
    expect(results[1]).toEqual({
      index: 1,
      event_id: 'event-2',
      status: 'open',
      written: false,
      reason: 'bulk_error',
      error: { type: 'mapper_parsing_exception', reason: 'bad field', status: 400 },
    });
  });

  it('returns per-item errors for duplicate event_ids without throwing', async () => {
    const eventClient = makeEventClient({
      bulkCreate: jest.fn().mockResolvedValue({
        errors: false,
        items: [{ create: { result: 'created', _id: 'doc-1', status: 201 } }],
      }),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [
        { ...baseInput, event_id: 'duplicate' },
        { ...baseInput, event_id: 'duplicate' },
      ],
    });

    expect(results[0]).toEqual(expect.objectContaining({ index: 0, written: true }));
    expect(results[1]).toEqual(
      expect.objectContaining({ index: 1, written: false, reason: 'duplicate_in_batch' })
    );
    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('routes to find-or-create (dedup scan) when event_id is absent', async () => {
    const findLatestActive = jest.fn().mockResolvedValue({ hits: [] });
    const findLatestByEventIds = jest.fn();
    const eventClient = makeEventClient({ findLatestActive, findLatestByEventIds });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [{ ...baseInput }],
    });

    // find-or-create: dedup scan runs, no snapshot lineage lookup needed.
    expect(findLatestActive).toHaveBeenCalledTimes(1);
    expect(findLatestByEventIds).not.toHaveBeenCalled();
    expect(results[0]).toMatchObject({ index: 0, written: true });
  });

  it.each([
    ['cardinality mismatch (empty items)', { errors: false, items: [] }],
    ['missing create result (item has no .create)', { errors: false, items: [{}] }],
  ])('classifies a %s bulk response as outcome unknown', async (_, response) => {
    const eventClient = makeEventClient({
      bulkCreate: jest.fn().mockResolvedValue(response),
    });

    await expect(
      eventsWriteBulkHandler({
        eventClient,
        inputs: [{ ...baseInput, event_id: 'event-1' }],
      })
    ).rejects.toMatchObject({ code: 'outcome_unknown' });
  });

  it('classifies a rejected bulk request as outcome unknown', async () => {
    const eventClient = makeEventClient({
      bulkCreate: jest.fn().mockRejectedValue(new Error('connection reset')),
    });

    await expect(
      eventsWriteBulkHandler({
        eventClient,
        inputs: [{ ...baseInput, event_id: 'event-1' }],
      })
    ).rejects.toMatchObject({ code: 'outcome_unknown' });
  });

  it('keeps the single-item wrapper throwing on an item failure', async () => {
    const eventClient = makeEventClient({
      bulkCreate: jest.fn().mockResolvedValue({
        errors: true,
        items: [
          { create: { status: 400, error: { type: 'mapper_parsing_exception', reason: 'bad' } } },
        ],
      }),
    });

    await expect(
      eventsWriteHandler({
        eventClient,
        input: { ...baseInput, event_id: 'event-1' },
      })
    ).rejects.toThrow('mapper_parsing_exception: bad');
  });
});

describe('eventsWriteBulkHandler — dedup mode', () => {
  type DetectionSignal = Extract<SignalEntry, { type: 'detection' }>;
  type ChangePointType = DetectionSignal['metadata']['change_point_type'];

  const makeDetectionSignal = (
    metadata: Partial<DetectionSignal['metadata']> = {}
  ): DetectionSignal => ({
    type: 'detection',
    stream_name: 'logs.checkout',
    description: 'High Latency',
    verdict: 'confirms',
    metadata: {
      detection_id: 'det-rule-abc',
      rule_uuid: 'rule-abc',
      rule_name: 'High Latency',
      change_point_type: 'spike',
      p_value: 0.01,
      ...metadata,
    },
  });

  const makeDedupInput = (overrides: Partial<EventsWriteInput> = {}): EventsWriteInput => ({
    ...baseInput,
    status: 'open',
    stream_names: ['logs.checkout'],
    signals: [makeDetectionSignal()],
    ...overrides,
  });

  const makeDedupInputWithChangePointType = (
    changePointType: ChangePointType | undefined
  ): EventsWriteInput => {
    if (changePointType === undefined) {
      const { change_point_type: _, ...metadata } = makeDetectionSignal().metadata;
      return makeDedupInput({
        signals: [{ ...makeDetectionSignal(), metadata: metadata as DetectionSignal['metadata'] }],
      });
    }
    return makeDedupInput({
      signals: [makeDetectionSignal({ change_point_type: changePointType })],
    });
  };

  const dedupInput = makeDedupInput();

  const makeActiveDedupEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent =>
    makeStoredEvent('existing-event-id', {
      '@timestamp': new Date().toISOString(),
      signals: dedupInput.signals,
      ...overrides,
    });

  it('skips write and returns existing event_id when an active duplicate is found', async () => {
    const eventClient = makeEventClient({
      findLatestActive: jest.fn().mockResolvedValue({ hits: [makeActiveDedupEvent()] }),
      bulkCreate: jest.fn(),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [dedupInput],
    });

    expect(results[0]).toMatchObject({
      index: 0,
      written: false,
      skipped: true,
      reason: 'existing_active_event',
      event_id: 'existing-event-id',
      existing_event_id: 'existing-event-id',
    });
    expect(eventClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('deduplicates when the candidate has the same identity regardless of change_point_type', async () => {
    const existingEvent = makeActiveDedupEvent({
      signals: [makeDetectionSignal({ change_point_type: 'spike' })],
    });
    const eventClient = makeEventClient({
      findLatestActive: jest.fn().mockResolvedValue({ hits: [existingEvent] }),
      bulkCreate: jest.fn(),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [makeDedupInputWithChangePointType('dip')],
    });

    expect(results[0]).toMatchObject({
      index: 0,
      written: false,
      skipped: true,
      reason: 'existing_active_event',
    });
    expect(eventClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('deduplicates against a stale-timestamped active event (no time bound on dedup)', async () => {
    // Previously this would write through because the event predated the dedup_window.
    // Now dedup is time-unbounded: any active event with the same identity is a duplicate.
    const oldActiveEvent = makeActiveDedupEvent({ '@timestamp': '2000-01-01T00:00:00.000Z' });
    const eventClient = makeEventClient({
      findLatestActive: jest.fn().mockResolvedValue({ hits: [oldActiveEvent] }),
      bulkCreate: jest.fn(),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [dedupInput],
    });

    expect(results[0]).toMatchObject({
      index: 0,
      written: false,
      skipped: true,
      reason: 'existing_active_event',
    });
    expect(eventClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('returns duplicate_in_batch error for a second in-batch item with the same identity', async () => {
    const eventClient = makeEventClient({
      findLatestActive: jest.fn().mockResolvedValue({ hits: [] }),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [dedupInput, { ...dedupInput }],
    });

    expect(results[0]).toMatchObject({ index: 0, written: true });
    expect(results[1]).toMatchObject({ index: 1, written: false, reason: 'duplicate_in_batch' });
    expect(eventClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
  });

  it('treats two in-batch dedup items with same streams+rules as duplicate_in_batch regardless of change_point_type', async () => {
    const eventClient = makeEventClient({
      findLatestActive: jest.fn().mockResolvedValue({ hits: [] }),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [
        makeDedupInputWithChangePointType('spike'),
        makeDedupInputWithChangePointType('dip'),
      ],
    });

    expect(results[0]).toMatchObject({ index: 0, written: true });
    expect(results[1]).toMatchObject({ index: 1, written: false, reason: 'duplicate_in_batch' });
    expect(eventClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
  });

  it('deduplicates a later in-batch item against an earlier one with the same change_point_type', async () => {
    const spikeInput = makeDedupInputWithChangePointType('spike');
    const eventClient = makeEventClient({
      findLatestActive: jest.fn().mockResolvedValue({ hits: [] }),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [spikeInput, makeDedupInputWithChangePointType('dip'), { ...spikeInput }],
    });

    expect(results[0]).toMatchObject({ index: 0, written: true });
    expect(results[1]).toMatchObject({ index: 1, written: false, reason: 'duplicate_in_batch' });
    expect(results[2]).toMatchObject({ index: 2, written: false, reason: 'duplicate_in_batch' });
  });

  it('treats dedup items with same identity (change_point_type omitted vs explicit) as duplicate_in_batch', async () => {
    const eventClient = makeEventClient({
      findLatestActive: jest.fn().mockResolvedValue({ hits: [] }),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [
        makeDedupInputWithChangePointType(undefined),
        makeDedupInputWithChangePointType('spike'),
      ],
    });

    expect(results[0]).toMatchObject({ index: 0, written: true });
    expect(results[1]).toMatchObject({ index: 1, written: false, reason: 'duplicate_in_batch' });
    expect(eventClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
  });

  it('uses only one findLatestActive scan for multiple dedup candidates', async () => {
    const findLatestActive = jest.fn().mockResolvedValue({ hits: [] });
    const eventClient = makeEventClient({ findLatestActive });

    await eventsWriteBulkHandler({
      eventClient,
      inputs: [dedupInput, { ...dedupInput, stream_names: ['logs.payments'] }],
    });

    expect(findLatestActive).toHaveBeenCalledTimes(1);
    expect(findLatestActive).toHaveBeenCalledWith({
      streamNames: expect.arrayContaining(['logs.checkout', 'logs.payments']),
      ruleUuids: ['rule-abc'],
    });
  });

  it.each<{ field: 'ruleUuids' | 'streamNames'; override: Partial<EventsWriteInput> }>([
    { field: 'ruleUuids', override: { stream_names: ['logs.payments'], signals: [] } },
    { field: 'streamNames', override: { stream_names: [] } },
  ])(
    'omits $field from the scan when any candidate in the batch has none',
    async ({ field, override }) => {
      const findLatestActive = jest.fn().mockResolvedValue({ hits: [] });
      const eventClient = makeEventClient({ findLatestActive });

      await eventsWriteBulkHandler({
        eventClient,
        inputs: [dedupInput, { ...dedupInput, ...override }],
      });

      expect(findLatestActive).toHaveBeenCalledWith(
        expect.objectContaining({ [field]: undefined })
      );
    }
  );

  it('deduplicates when candidate rule set is a subset of an active event and streams overlap', async () => {
    // Existing event covers rules [rule-abc, rule-xyz]; candidate carries only [rule-abc].
    // Co-detection noise: rule-xyz was a co-fire last cycle but not this one.
    // Candidate rules ⊆ event rules AND stream overlaps → existing_active_event, not a new event.
    const widerRuleEvent = makeActiveDedupEvent({
      signals: [
        makeDetectionSignal(),
        makeDetectionSignal({ rule_uuid: 'rule-xyz', detection_id: 'det-rule-xyz' }),
      ],
    });
    const eventClient = makeEventClient({
      findLatestActive: jest.fn().mockResolvedValue({ hits: [widerRuleEvent] }),
      bulkCreate: jest.fn(),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [dedupInput], // carries only rule-abc
    });

    expect(results[0]).toMatchObject({
      index: 0,
      written: false,
      skipped: true,
      reason: 'existing_active_event',
    });
    expect(eventClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('creates a new event when candidate carries a rule not present in any active event', async () => {
    // Existing event covers [rule-abc]; candidate carries [rule-xyz] — genuinely new signal.
    const existingEvent = makeActiveDedupEvent({ signals: [makeDetectionSignal()] });
    const eventClient = makeEventClient({
      findLatestActive: jest.fn().mockResolvedValue({ hits: [existingEvent] }),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [
        makeDedupInput({
          signals: [makeDetectionSignal({ rule_uuid: 'rule-xyz', detection_id: 'det-xyz' })],
        }),
      ],
    });

    expect(results[0]).toMatchObject({ index: 0, written: true });
    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('deduplicates when candidate stream set is a subset of an active event streams and rules match', async () => {
    // Existing covers [checkout, payments]; candidate on [payments] only — stream overlap, same rules.
    const widerStreamEvent = makeActiveDedupEvent({
      stream_names: ['logs.checkout', 'logs.payments'],
    });
    const eventClient = makeEventClient({
      findLatestActive: jest.fn().mockResolvedValue({ hits: [widerStreamEvent] }),
      bulkCreate: jest.fn(),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [{ ...dedupInput, stream_names: ['logs.payments'] }],
    });

    expect(results[0]).toMatchObject({
      index: 0,
      written: false,
      skipped: true,
      reason: 'existing_active_event',
    });
    expect(eventClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('creates a new event when no stream overlap exists even if rule set matches', async () => {
    // Existing on [checkout]; candidate on [payments] — no stream intersection, no match.
    const checkoutEvent = makeActiveDedupEvent({ stream_names: ['logs.checkout'] });
    const eventClient = makeEventClient({
      findLatestActive: jest.fn().mockResolvedValue({ hits: [checkoutEvent] }),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [{ ...dedupInput, stream_names: ['logs.payments'] }],
    });

    expect(results[0]).toMatchObject({ index: 0, written: true });
    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('treats omitted and empty change_point_type as equivalent for window dedup (identity-based)', async () => {
    const existingEvent = makeActiveDedupEvent({
      signals: [makeDetectionSignal({ change_point_type: '' as ChangePointType })],
    });

    const eventClient = makeEventClient({
      findLatestActive: jest.fn().mockResolvedValue({ hits: [existingEvent] }),
      bulkCreate: jest.fn(),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [makeDedupInputWithChangePointType(undefined)],
    });

    expect(results[0]).toMatchObject({
      written: false,
      skipped: true,
      reason: 'existing_active_event',
    });
    expect(eventClient.bulkCreate).not.toHaveBeenCalled();
  });
});

describe('eventsWriteBulkHandler — continuation status', () => {
  it.each<[string, SignificantEvent['status']]>([
    ['open', 'open'],
    ['closed', 'closed'],
  ])('persists %s status from discovery through to the bulk payload', async (_, status) => {
    const eventId = `checkout-${status}`;
    const stored = makeStoredEvent(eventId, { status, severity: undefined });
    const eventClient = makeEventClient({
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map([[eventId, stored]])),
      findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [{ ...baseInput, event_id: eventId, status }],
    });

    expect(results[0]).toMatchObject({ written: true, status });
    expect(eventClient.bulkCreate.mock.calls[0][0][0].status).toBe(status);
  });

  it('no-op guard skips when both severity and status are identical to latest', async () => {
    const stored = makeStoredEvent('checkout-stable');
    const eventClient = makeEventClient({
      findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
      bulkCreate: jest.fn(),
    });

    const results = await eventsWriteBulkHandler({
      eventClient,
      inputs: [{ ...baseInput, event_id: 'checkout-stable', status: 'open', severity: '60-high' }],
    });

    expect(results[0]).toMatchObject({
      index: 0,
      written: false,
      skipped: true,
      reason: 'unchanged_outcome',
      event_id: 'checkout-stable',
    });
    expect(eventClient.bulkCreate).not.toHaveBeenCalled();
    expect(eventClient.findByEventId).toHaveBeenCalledWith('checkout-stable');
  });

  it.each<[string, Partial<EventsWriteInput>, SignificantEvent['status']]>([
    [
      'severity escalates (60-high → 80-critical)',
      { status: 'open', severity: '80-critical' },
      'open',
    ],
    ['status transitions (open → closed)', { status: 'closed', severity: '60-high' }, 'closed'],
  ])(
    'write-through: writes when %s (no-op does not fire)',
    async (_, inputOverrides, expectedStatus) => {
      const stored = makeStoredEvent('checkout-changing');
      const eventClient = makeEventClient({
        findLatestByEventIds: jest.fn().mockResolvedValue(new Map([['checkout-changing', stored]])),
        findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
      });

      const results = await eventsWriteBulkHandler({
        eventClient,
        inputs: [{ ...baseInput, event_id: 'checkout-changing', ...inputOverrides }],
      });

      expect(results[0]).toMatchObject({ written: true, status: expectedStatus });
      expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    }
  );
});

describe('eventsWriteItemSchema', () => {
  const validItem = {
    ...baseInput,
    signals: [
      {
        type: 'detection',
        stream_name: 'logs.test',
        description: 'x'.repeat(MAX_SIGNAL_DESCRIPTION_LENGTH),
        verdict: 'not_checked',
        metadata: {
          detection_id: 'det-1',
          rule_uuid: 'rule-1',
          change_point_type: 'spike',
          p_value: 0.01,
        },
      },
    ],
  };

  it('accepts a valid item at the field length boundaries', () => {
    expect(eventsWriteItemSchema.safeParse(validItem).success).toBe(true);
  });

  it.each([
    [
      'signal description',
      {
        signals: [
          { ...validItem.signals[0], description: 'x'.repeat(MAX_SIGNAL_DESCRIPTION_LENGTH + 1) },
        ],
      },
    ],
    ['symptom_hypothesis', { symptom_hypothesis: 'x'.repeat(MAX_SYMPTOM_HYPOTHESIS_LENGTH + 1) }],
    ['summary', { summary: 'x'.repeat(MAX_SUMMARY_LENGTH + 1) }],
    ['assessment_note', { assessment_note: 'x'.repeat(MAX_ASSESSMENT_NOTE_LENGTH + 1) }],
  ])('rejects %s exceeding the length limit', (_, overrides) => {
    expect(eventsWriteItemSchema.safeParse({ ...validItem, ...overrides }).success).toBe(false);
  });
});

describe('eventsWriteBulkHandler — narrative hijack guard', () => {
  type DetectionSignal = Extract<SignalEntry, { type: 'detection' }>;

  const makeDetectionSignal = (ruleUuid: string): DetectionSignal => ({
    type: 'detection',
    stream_name: 'logs.app',
    description: `Signal for ${ruleUuid}`,
    verdict: 'confirms',
    metadata: {
      detection_id: `det-${ruleUuid}`,
      rule_uuid: ruleUuid,
      rule_name: ruleUuid,
      change_point_type: 'spike',
      p_value: 0.01,
    },
  });

  const makeCausal = (featureId: string): CausalFeature => ({
    feature_id: featureId,
    type: 'entity',
    subtype: 'service',
    name: featureId,
    stream_name: 'logs.app',
  });

  const makeSnapshotInput = (
    eventId: string,
    overrides: Partial<EventsWriteInput> = {}
  ): EventsWriteInput => ({
    ...baseInput,
    // Use a severity that differs from makeStoredEvent's '60-high' default so the no-op guard
    // (shouldSkipAsNoOp) does not suppress writes in tests that are verifying the gate, not the
    // no-op. Tests specifically exercising the no-op interaction override this via `overrides`.
    severity: '80-critical',
    event_id: eventId,
    signals: [makeDetectionSignal('rule-eis-auth')],
    causal_features: [],
    blast_radius: [],
    ...overrides,
  });

  const makeStoredEventWithRules = (
    eventId: string,
    ruleUuids: string[],
    topologyOverrides: {
      causal_features?: CausalFeature[];
      blast_radius?: BlastRadiusEntry[];
    } = {}
  ): SignificantEvent =>
    makeStoredEvent(eventId, {
      signals: ruleUuids.map((uuid) => makeDetectionSignal(uuid)),
      causal_features: topologyOverrides.causal_features ?? [],
      blast_radius: topologyOverrides.blast_radius ?? [],
    });

  it('narrative guard: preserves stored title and symptom_hypothesis when no new rules are introduced', async () => {
    const eventId = 'event-narrative-stable';
    const stored = makeStoredEventWithRules(eventId, ['rule-eis-auth'], {
      causal_features: [makeCausal('svc-eis')],
    });
    stored.title = 'EIS gateway — authorization endpoint HTTP errors';
    stored.symptom_hypothesis = 'EIS auth route returns >=400 for all clients.';

    const eventClient = makeEventClient({
      findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
    });

    const [result] = await eventsWriteBulkHandler({
      eventClient,
      inputs: [
        makeSnapshotInput(eventId, {
          signals: [makeDetectionSignal('rule-eis-auth')], // same rule — no new rules
          title: 'Agentless CEL state registry — cleanup remove 404 not_found', // attempted hijack
          symptom_hypothesis: 'CEL filebeat registry-remove 404s.', // attempted hijack
        }),
      ],
    });

    expect(result.written).toBe(true);
    if (result.written) {
      expect(result.narrative_preserved).toBe(true);
    }
    // Verify the stored values were written to ES, not the caller's hijack values
    const writtenDoc = eventClient.bulkCreate.mock.calls[0][0][0] as Partial<SignificantEvent>;
    expect(writtenDoc.title).toBe('EIS gateway — authorization endpoint HTTP errors');
    expect(writtenDoc.symptom_hypothesis).toBe('EIS auth route returns >=400 for all clients.');
  });

  it('narrative guard: allows submitted narrative when a new related rule is introduced', async () => {
    const eventId = 'event-narrative-updated';
    const stored = makeStoredEventWithRules(eventId, ['rule-eis-auth']);
    stored.title = 'EIS gateway — authorization endpoint HTTP errors';
    stored.symptom_hypothesis = 'EIS auth route returns >=400 for all clients.';

    const eventClient = makeEventClient({
      findByEventId: jest.fn().mockResolvedValue({ hits: [stored] }),
    });

    const [result] = await eventsWriteBulkHandler({
      eventClient,
      inputs: [
        makeSnapshotInput(eventId, {
          signals: [
            makeDetectionSignal('rule-eis-auth'), // existing
            makeDetectionSignal('rule-sagemaker'), // NEW related rule
          ],
          title: 'EIS gateway — auth and SageMaker provider errors',
          symptom_hypothesis: 'Both auth route and SageMaker provider return >=400.',
        }),
      ],
    });

    expect(result.written).toBe(true);
    if (result.written) {
      expect(result.narrative_preserved).toBeUndefined();
    }
    const writtenDoc = eventClient.bulkCreate.mock.calls[0][0][0] as Partial<SignificantEvent>;
    expect(writtenDoc.title).toBe('EIS gateway — auth and SageMaker provider errors');
    expect(writtenDoc.symptom_hypothesis).toBe(
      'Both auth route and SageMaker provider return >=400.'
    );
  });
});
