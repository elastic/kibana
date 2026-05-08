/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUpdateStreamTool } from './update_stream';
import { STREAMS_UPDATE_STREAM_TOOL_ID } from '../tool_ids';
import { createMockGetScopedClients, createMockToolContext } from '../../utils/test_helpers';
import { StreamsWriteQueue } from '../../utils/write_queue';

describe('createUpdateStreamTool', () => {
  const setup = () => {
    const { getScopedClients, streamsClient } = createMockGetScopedClients();
    const writeQueue = new StreamsWriteQueue();
    const tool = createUpdateStreamTool({ getScopedClients, writeQueue });
    const context = createMockToolContext();
    return { tool, context, streamsClient };
  };

  it('has the expected tool id', () => {
    expect(STREAMS_UPDATE_STREAM_TOOL_ID).toBe('platform.streams.update_stream');
  });

  describe('confirmation dialog', () => {
    // The platform renders a confirmation dialog before applying any
    // update. Coverage here protects two contracts simultaneously:
    //   1. `confirmation.askUser === 'always'` so the dialog is never
    //      bypassed for state-mutating updates.
    //   2. `getConfirmation` produces the title / message / button text
    //      shape the platform consumes — silent regressions here would
    //      surface as a broken dialog UI.

    it('has confirmation policy set to always', () => {
      const { tool } = setup();
      expect(tool.confirmation).toBeDefined();
      expect(tool.confirmation!.askUser).toBe('always');
    });

    it('uses confirmation_body verbatim as the dialog message when provided', async () => {
      const { tool } = setup();
      const md =
        '## Proposed change\n\nAdd `grok` step to `body.text`.\n\n**Impact:** new `attributes.source.ip` field.';

      const confirmation = await tool.confirmation!.getConfirmation!({
        toolParams: {
          name: 'logs.test',
          changes: { processing: [{ action: 'grok' }] },
          confirmation_body: md,
        },
      });

      expect(confirmation.title).toBe('Update stream "logs.test"');
      expect(confirmation.confirm_text).toBe('Apply changes');
      expect(confirmation.color).toBe('primary');
      expect(confirmation.message).toBe(md);
    });

    it('falls back to a readable summary when confirmation_body is omitted', async () => {
      const { tool } = setup();

      const confirmation = await tool.confirmation!.getConfirmation!({
        toolParams: {
          name: 'logs.test',
          changes: { processing: [{ action: 'grok' }, { action: 'date' }] },
        },
      });

      // The fallback summary surfaces the tool params (with underscores
      // turned into spaces) so the dialog is never blank. The exact
      // wording is asserted in `confirmation_helpers.test.ts`; here we
      // only check that the wiring engages the fallback.
      expect(confirmation.message).toContain('**name:** logs.test');
      expect(confirmation.message).toContain('**changes:** processing');
      expect(confirmation.message).not.toContain('confirmation_body');
    });
  });

  describe('handler', () => {
    // A bare-minimum wired ingest-stream definition the patchIngestAndUpsert
    // helper accepts — kept inline so each success-path test stays
    // self-contained.
    const wiredIngestDefinition = (name: string) => ({
      name,
      description: '',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: { steps: [] },
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
        settings: {},
      },
    });

    it('applies processing changes via streamsClient.upsertStream and reports success', async () => {
      // Mirrors the local convention used in delete_stream.test.ts and
      // create_partition.test.ts: drive the real handler, assert the
      // underlying client received the expected shape, and check the
      // user-facing note picks the "processing applied" variant.
      const { tool, context, streamsClient } = setup();
      streamsClient.getStream.mockResolvedValue(wiredIngestDefinition('logs.test') as never);

      const newSteps = [{ action: 'grok', from: 'body.text', patterns: ['%{IP:attributes.ip}'] }];
      const result = await tool.handler(
        { name: 'logs.test', changes: { processing: newSteps as never } },
        context
      );

      expect(streamsClient.upsertStream).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'logs.test',
          request: expect.objectContaining({
            stream: expect.objectContaining({
              ingest: expect.objectContaining({
                processing: expect.objectContaining({ steps: newSteps }),
              }),
            }),
          }),
        })
      );

      if (!('results' in result)) throw new Error('Expected results');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.applied_changes).toEqual(['processing']);
      expect(data.note).toEqual(expect.stringContaining('Processing changes applied'));
    });

    it('returns an "empty changes" note when no change keys are populated', async () => {
      // The schema permits an empty `changes` object — the handler must
      // not silently pass through to the upsert in that case, or the
      // user gets a "success" with no observable effect.
      const { tool, context, streamsClient } = setup();

      const result = await tool.handler({ name: 'logs.test', changes: {} }, context);

      // Critical safety property: with no changes we MUST NOT touch the
      // stream at all (no fetch, no upsert).
      expect(streamsClient.getStream).not.toHaveBeenCalled();
      expect(streamsClient.upsertStream).not.toHaveBeenCalled();

      if (!('results' in result)) throw new Error('Expected results');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.success).toBe(false);
      expect(data.applied_changes).toEqual([]);
      expect(data.note).toEqual(expect.stringContaining('No changes were applied'));
    });

    it('returns a typed error when the underlying upsert fails', async () => {
      // Mirrors the "returns error when delete fails" pattern from
      // delete_stream.test.ts. Verifies that infrastructure errors are
      // wrapped with `operation: 'update_stream'` for the agent.
      const { tool, context, streamsClient } = setup();
      streamsClient.getStream.mockResolvedValue(wiredIngestDefinition('logs.test') as never);
      streamsClient.upsertStream.mockRejectedValue(new Error('connection reset'));

      const result = await tool.handler(
        { name: 'logs.test', changes: { description: 'updated' } },
        context
      );

      if (!('results' in result)) throw new Error('Expected results');
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.operation).toBe('update_stream');
      expect(data.message).toEqual(expect.stringContaining('connection reset'));
    });

    it('returns a typed validation error when processing steps are malformed', async () => {
      // Schema lets `step` be any object so the LLM can pass through
      // varying shapes, but we need to validate before the upsert. The
      // user-visible message should explain how to recover.
      const { tool, context } = setup();

      const result = await tool.handler(
        {
          name: 'logs.test',
          changes: {
            processing: [{ action: 'unknown_action_that_fails_validation' } as never],
          },
        },
        context
      );

      if (!('results' in result)) throw new Error('Expected results');
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.operation).toBe('update_stream');
      expect(data.message).toEqual(expect.stringContaining('Invalid processing steps'));
    });
  });
});
