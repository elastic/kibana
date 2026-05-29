/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsManagementSkill } from './streams_management_skill';
import {
  STREAMS_READ_TOOL_IDS,
  STREAMS_WRITE_TOOL_IDS,
  STREAMS_INSPECT_STREAMS_TOOL_ID,
  STREAMS_DIAGNOSE_STREAM_TOOL_ID,
  STREAMS_QUERY_DOCUMENTS_TOOL_ID,
  STREAMS_DESIGN_PIPELINE_TOOL_ID,
  STREAMS_LIST_ILM_POLICIES_TOOL_ID,
  STREAMS_UPDATE_STREAM_TOOL_ID,
  STREAMS_CREATE_PARTITION_TOOL_ID,
  STREAMS_DELETE_STREAM_TOOL_ID,
} from '../tools/tool_ids';

describe('streamsManagementSkill', () => {
  it('has the expected id and name', () => {
    expect(streamsManagementSkill.id).toBe('streams-management');
    expect(streamsManagementSkill.name).toBe('streams-management');
  });

  it('returns all read and write tool IDs from getRegistryTools', async () => {
    const toolIds = await streamsManagementSkill.getRegistryTools!();
    expect(toolIds).toEqual([...STREAMS_READ_TOOL_IDS, ...STREAMS_WRITE_TOOL_IDS]);
  });

  it('does not include sig events tools in getRegistryTools', async () => {
    const toolIds = await streamsManagementSkill.getRegistryTools!();
    expect(toolIds.every((id: string) => !id.includes('sig_events'))).toBe(true);
    expect(toolIds.every((id: string) => !id.includes('ki_search'))).toBe(true);
  });

  describe('skill content references all registered tool IDs in <tool_selection>', () => {
    const { content } = streamsManagementSkill;

    const allToolIds = [
      STREAMS_INSPECT_STREAMS_TOOL_ID,
      STREAMS_DIAGNOSE_STREAM_TOOL_ID,
      STREAMS_QUERY_DOCUMENTS_TOOL_ID,
      STREAMS_DESIGN_PIPELINE_TOOL_ID,
      STREAMS_LIST_ILM_POLICIES_TOOL_ID,
      STREAMS_UPDATE_STREAM_TOOL_ID,
      STREAMS_CREATE_PARTITION_TOOL_ID,
      STREAMS_DELETE_STREAM_TOOL_ID,
    ];

    for (const toolId of allToolIds) {
      it(`references ${toolId}`, () => {
        expect(content).toContain(toolId);
      });
    }
  });

  it('contains key behavioral sections', () => {
    const { content } = streamsManagementSkill;
    expect(content).toContain('<tool_selection>');
    expect(content).toContain('<efficiency>');
    expect(content).toContain('<remediation_workflows>');
    expect(content).toContain('<temporal_behavior>');
    expect(content).toContain('<boundaries>');
  });

  it('has a non-empty description mentioning streams', () => {
    expect(streamsManagementSkill.description).toBeTruthy();
    expect(streamsManagementSkill.description).toContain('streams');
  });

  // Behavioural-contract invariants. Each test locks a specific contract
  // the prompt makes with the agent — substring-style assertions so a
  // future word-level rephrase doesn't trip the test, but a regression of
  // the underlying rule does. Add a new test here whenever a new
  // contract is introduced; do not delete one without replacing it.
  describe('skill prompt invariants', () => {
    const { content } = streamsManagementSkill;

    it('names the general "Warnings handling" rule and applies it to any tool result with a warnings array', () => {
      expect(content).toContain('Warnings handling');
      expect(content).toContain('any tool result with a `warnings` array');
      expect(content).toContain('verbatim');
      // The rule has to apply hard-stop semantics to every write tool —
      // not just `${UPDATE_STREAM}` — or chaining slips through on
      // partition / delete paths.
      expect(content).toContain(STREAMS_UPDATE_STREAM_TOOL_ID);
      expect(content).toContain(STREAMS_CREATE_PARTITION_TOOL_ID);
      expect(content).toContain(STREAMS_DELETE_STREAM_TOOL_ID);
    });

    it('tells the agent to branch on the structured `extract_fields_outcome` instead of parsing prose', () => {
      expect(content).toContain('extract_fields_outcome');
      expect(content).toContain('extract_fields_reason');
      // All three outcomes have explicit guidance — dropping any of them
      // leaves the agent without a behaviour for that branch.
      for (const outcome of ['success', 'fallback', 'unsupported']) {
        expect(content).toContain(`\`${outcome}\``);
      }
    });

    it('keeps the `extract_fields: true` decision rule single-source-of-truth and free of anti-patterns', () => {
      // Rule body (substring stable across rephrases of the rationale).
      expect(content).toContain('did not name specific output fields');

      // The rule must appear once. Counting on the unique anchor phrase
      // keeps the assertion robust to surrounding edits.
      const occurrences = content.match(/did not name specific output fields/g) ?? [];
      expect(occurrences).toHaveLength(1);

      // Locking the absence prevents accidental re-introduction:
      //   - Naming the rule ("decision rule") creates a discoverable
      //     concept the LLM restates in its own paragraph.
      //   - Negative instructions ("do not restate") anchor the exact
      //     behaviour we want to prevent.
      //   - Cross-references ("see / per the … rule") drive the same
      //     restatement behaviour.
      expect(content).not.toMatch(/extract_fields\s+decision\s+rule/i);
      expect(content).not.toMatch(/do not restate/i);
      expect(content).not.toMatch(/(?:per|see|refer to|apply)\s+the\s+[`']?extract_fields/i);
    });

    it('names `seed_source_field` as the steering knob and the three resolution choices on conflict', () => {
      expect(content).toContain('seed_source_field');
      // Three resolution choices the agent must surface verbatim when a
      // duplication / overwrite warning fires on the auto-picked field.
      expect(content).toContain('build on top');
      expect(content).toContain('redirecting via `seed_source_field`');
      expect(content).toContain('extract_fields: false');
    });

    it('uses `previous_suggestions` (not `existing_partitions`) as the iteration parameter for ${SUGGEST_PARTITIONS}', () => {
      // Input parameter name on the request side.
      expect(content).toContain('previous_suggestions');
      // The result-side field `existing_partitions` may still appear (it
      // is the response field name) but it must NEVER be described as
      // the parameter to pass back when iterating — that was the
      // pre-rename collision.
      expect(content).not.toMatch(/pass[^.]*existing_partitions/i);
      expect(content).not.toMatch(/via\s+`?existing_partitions`?/i);
    });

    it('teaches the `insufficient_samples` reason and tells the agent to quote sample_count / minimum_required', () => {
      expect(content).toContain('insufficient_samples');
      expect(content).toContain('sample_count');
      expect(content).toContain('minimum_required');
    });

    it('warns the agent to pass `pipeline_steps` when chaining ${REFINE_EXTRACTED_FIELD} from a still-proposed pipeline', () => {
      // The CRITICAL guard against the field_not_found regression
      // observed in live testing — without `pipeline_steps`, the
      // refinement tool inspects the on-disk pipeline and rejects.
      expect(content).toContain('pipeline_steps');
      expect(content).toContain('field_not_found');
    });
  });
});
