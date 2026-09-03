/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IMPROVEMENT_ACTIONS } from '../../../../common/http_api/improvement_actions';
import {
  MAX_PREVIEW_LENGTH,
  getActionLabel,
  getProposedChangeFields,
  getProvenanceSummary,
  getReversibilityNote,
  getStatusLabel,
  truncate,
} from './improvement_format';
import { buildImprovement } from './improvement_test_fixtures';

describe('truncate', () => {
  it('leaves a short value alone', () => {
    expect(truncate('short')).toEqual({ text: 'short', isTruncated: false });
  });

  it('clamps a long value and reports it', () => {
    const { text, isTruncated } = truncate('x'.repeat(MAX_PREVIEW_LENGTH + 1));

    expect(isTruncated).toBe(true);
    expect(text).toHaveLength(MAX_PREVIEW_LENGTH + 1); // the ellipsis replaces nothing
    expect(text.endsWith('…')).toBe(true);
  });
});

describe('getActionLabel', () => {
  it('labels every action', () => {
    for (const action of IMPROVEMENT_ACTIONS) {
      expect(getActionLabel(action)).toBeTruthy();
    }
  });

  it('does not describe a removal as a deletion', () => {
    expect(getActionLabel('remove_ki')).toBe('Exclude knowledge indicator');
    expect(getActionLabel('remove_workflow')).toBe('Disable automation');
  });
});

describe('getReversibilityNote', () => {
  it.each(['remove_ki', 'remove_workflow', 'remove_source'] as const)(
    'says that %s can be undone',
    (action) => {
      expect(getReversibilityNote(action)).toMatch(/undone|left in the index/);
    }
  );

  it('says nothing for an action that adds', () => {
    expect(getReversibilityNote('add_ki')).toBeUndefined();
  });
});

describe('getStatusLabel', () => {
  it('labels every status', () => {
    for (const status of ['suggested', 'applied', 'rejected', 'failed'] as const) {
      expect(getStatusLabel(status)).toBeTruthy();
    }
  });
});

describe('getProposedChangeFields', () => {
  it('renders the KI fields of an add', () => {
    const fields = getProposedChangeFields(buildImprovement());

    expect(fields.map(({ label }) => label)).toEqual(['Type', 'Title', 'Content']);
    expect(fields).toContainEqual({ label: 'Title', value: 'Refund window' });
  });

  it('renders only the fields an edit actually changes', () => {
    const fields = getProposedChangeFields(
      buildImprovement({
        action: 'edit_ki',
        target: { ki_id: 'ki-1' },
        payload: { ki_patch: { content: '45 days' } },
      })
    );

    expect(fields).toEqual([
      { label: 'Knowledge indicator', value: 'ki-1' },
      { label: 'Content', value: '45 days' },
    ]);
  });

  it('renders workflow YAML as code', () => {
    const fields = getProposedChangeFields(
      buildImprovement({
        action: 'add_workflow',
        payload: { workflow_yaml: 'name: Nightly\nsteps: []\n' },
      })
    );

    expect(fields).toEqual([
      { label: 'Definition', value: 'name: Nightly\nsteps: []\n', isCode: true },
    ]);
  });

  it('names the replacement definition on an edit, so the reviewer knows it replaces', () => {
    const fields = getProposedChangeFields(
      buildImprovement({
        action: 'edit_workflow',
        target: { workflow_id: 'wf-1' },
        payload: { workflow_yaml: 'name: Nightly' },
      })
    );

    expect(fields.map(({ label }) => label)).toEqual(['Automation', 'Replacement definition']);
  });

  it('distinguishes a connector source from a query source', () => {
    expect(
      getProposedChangeFields(
        buildImprovement({
          action: 'add_source',
          payload: { source: { type: 'connector', value: 'connector-1' } },
        })
      )
    ).toEqual([{ label: 'Connector', value: 'connector-1', isCode: true }]);

    expect(
      getProposedChangeFields(
        buildImprovement({
          action: 'add_source',
          payload: { source: { type: 'esql', value: 'FROM logs-*' } },
        })
      )
    ).toEqual([{ label: 'Query', value: 'FROM logs-*', isCode: true }]);
  });

  it('shows the source a removal targets', () => {
    const fields = getProposedChangeFields(
      buildImprovement({
        action: 'remove_source',
        target: { source_value: 'FROM logs-*' },
        payload: {},
      })
    );

    expect(fields).toEqual([{ label: 'Current source', value: 'FROM logs-*', isCode: true }]);
  });
});

describe('getProvenanceSummary', () => {
  it('names the tags and the window the signals came from', () => {
    expect(getProvenanceSummary(buildImprovement())).toBe(
      'From 3 signals (coverage_gap) between now-30d and now'
    );
  });

  it('reads sensibly for a single untagged signal', () => {
    const summary = getProvenanceSummary(
      buildImprovement({
        provenance: {
          agent_run_id: 'run-1',
          signal_ids: ['sig-1'],
          signal_spaces: ['default'],
          signal_window: { from: 'now-7d', to: 'now' },
          signal_count: 1,
        },
      })
    );

    expect(summary).toBe('From 1 signal between now-7d and now');
  });
});
