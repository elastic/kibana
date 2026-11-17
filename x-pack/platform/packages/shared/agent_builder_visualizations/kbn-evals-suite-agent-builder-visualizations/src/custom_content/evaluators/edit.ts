/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { skippedResult } from '../../evaluator_utils';
import type { CustomContentEvaluator } from '../types';

export const CUSTOM_CONTENT_EDIT_EVALUATOR_NAME = 'Custom Content Edit';

/**
 * A style edit changes the template and leaves the query alone. A data edit changes the query.
 * Both need the edit to be stored as a new version of the same panel.
 */
export const createEditEvaluator = (): CustomContentEvaluator => ({
  name: CUSTOM_CONTENT_EDIT_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const kind = expected?.edit;
    if (!kind) {
      return skippedResult('This example is not an edit.');
    }

    const {
      after,
      attachmentId,
      panelId,
      versionCount,
      baseline,
      followUpToolIds,
      followUpToolArgs,
    } = output;
    if (followUpToolIds?.length === 0) {
      return {
        score: 0,
        label: 'no-follow-up-tool-call',
        explanation:
          'The agent answered the follow-up without calling a tool, so nothing was edited.',
      };
    }

    const before = baseline?.content;
    if (!baseline || !before || !after) {
      return {
        score: 0,
        label: 'not-stored-as-edit',
        explanation: 'There is no panel from the first turn and the follow-up to compare.',
      };
    }
    if (baseline.attachmentId !== attachmentId || baseline.panelId !== panelId) {
      return {
        score: 0,
        label: 'new-panel-instead-of-edit',
        explanation: 'The follow-up created a new panel instead of editing the first one.',
      };
    }
    if (versionCount <= baseline.versionCount) {
      return {
        score: 0,
        label: 'not-stored-as-edit',
        explanation: 'The follow-up did not store a new version of the panel.',
        metadata: { versionsBefore: baseline.versionCount, versionsAfter: versionCount },
      };
    }

    const queryChanged = before.esql !== after.esql;
    const templateChanged = before.template !== after.template;

    if (kind === 'style') {
      const checks = [
        { name: 'kept the query', passed: !queryChanged },
        { name: 'changed the template', passed: templateChanged },
      ];
      const failed = checks.filter(({ passed }) => !passed).map(({ name }) => name);
      return {
        score: (checks.length - failed.length) / checks.length,
        label: failed.length === 0 ? 'style-edit' : 'style-edit-failed',
        explanation:
          failed.length === 0
            ? 'The edit changed the template and kept the query.'
            : `A style edit should have: ${failed.join(', ')}.`,
        metadata: { queryChanged, templateChanged },
      };
    }

    return queryChanged
      ? { score: 1, label: 'data-edit', explanation: 'The edit changed the query.' }
      : {
          score: 0,
          label: 'data-edit-failed',
          explanation: 'A data edit should have changed the query, but it is unchanged.',
          metadata: { esql: after.esql, followUpToolArgs },
        };
  },
});
