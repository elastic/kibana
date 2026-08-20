/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowListItemDto } from '@kbn/workflows';
import { CaseCreatedTriggerId } from '../../../common/workflows/triggers';
import { createCaseWorkflowComparator, createCaseWorkflowFilter } from './use_run_case_workflow';

const createWorkflow = ({
  id,
  name = id,
  tags = [],
  triggerTypes = ['manual'],
}: {
  id: string;
  name?: string;
  tags?: string[];
  triggerTypes?: string[];
}): WorkflowListItemDto => ({
  id,
  name,
  description: '',
  enabled: true,
  valid: true,
  createdAt: '2026-08-18T00:00:00.000Z',
  definition: {
    version: '1',
    name,
    enabled: true,
    tags,
    steps: [],
    triggers: triggerTypes.map((type) => ({ type })),
  } as WorkflowListItemDto['definition'],
});

describe('createCaseWorkflowFilter', () => {
  it('only includes workflows matching any configured tag', () => {
    const workflows = [
      createWorkflow({ id: 'untagged' }),
      createWorkflow({ id: 'cases', tags: ['Cases'] }),
      createWorkflow({ id: 'operations', tags: ['Operations'] }),
      createWorkflow({ id: 'other', tags: ['Other'] }),
    ];

    expect(
      workflows.filter(createCaseWorkflowFilter(['Cases', 'Operations'])).map(({ id }) => id)
    ).toEqual(['cases', 'operations']);
  });

  it('matches configured tags exactly and case-sensitively', () => {
    const workflows = [
      createWorkflow({ id: 'exact', tags: ['Cases'] }),
      createWorkflow({ id: 'different-case', tags: ['cases'] }),
    ];

    expect(workflows.filter(createCaseWorkflowFilter(['Cases'])).map(({ id }) => id)).toEqual([
      'exact',
    ]);
  });

  it('includes all workflows when no tags are configured', () => {
    const workflows = [
      createWorkflow({ id: 'untagged' }),
      createWorkflow({ id: 'tagged', tags: ['Cases'] }),
    ];

    expect(workflows.filter(createCaseWorkflowFilter([]))).toEqual(workflows);
  });
});

describe('createCaseWorkflowComparator', () => {
  it('prioritizes workflows matching any configured tag', () => {
    const untagged = createWorkflow({ id: 'untagged' });
    const firstTag = createWorkflow({ id: 'first', tags: ['Cases'] });
    const secondTag = createWorkflow({ id: 'second', tags: ['Operations'] });

    expect(
      [untagged, firstTag, secondTag]
        .sort(createCaseWorkflowComparator(['Cases', 'Operations']))
        .map(({ id }) => id)
    ).toEqual(['first', 'second', 'untagged']);
  });

  it('matches tags exactly and case-sensitively', () => {
    const exact = createWorkflow({ id: 'exact', tags: ['Cases'] });
    const differentCase = createWorkflow({ id: 'different-case', tags: ['cases'] });

    expect(
      [differentCase, exact].sort(createCaseWorkflowComparator(['Cases'])).map(({ id }) => id)
    ).toEqual(['exact', 'different-case']);
  });

  it('prioritizes a configured tag over a Cases trigger', () => {
    const casesTrigger = createWorkflow({
      id: 'trigger',
      triggerTypes: [CaseCreatedTriggerId],
    });
    const tagged = createWorkflow({ id: 'tagged', tags: ['Cases'] });

    expect(
      [casesTrigger, tagged].sort(createCaseWorkflowComparator(['Cases'])).map(({ id }) => id)
    ).toEqual(['tagged', 'trigger']);
  });

  it('retains Cases trigger ranking within tagged and untagged groups', () => {
    const workflows = [
      createWorkflow({ id: 'other' }),
      createWorkflow({ id: 'tagged-other', tags: ['Cases'] }),
      createWorkflow({ id: 'case-trigger', triggerTypes: [CaseCreatedTriggerId] }),
      createWorkflow({
        id: 'tagged-case-trigger',
        tags: ['Cases'],
        triggerTypes: [CaseCreatedTriggerId],
      }),
    ];

    expect(workflows.sort(createCaseWorkflowComparator(['Cases'])).map(({ id }) => id)).toEqual([
      'tagged-case-trigger',
      'tagged-other',
      'case-trigger',
      'other',
    ]);
  });

  it('uses only trigger ranking when no tags are configured', () => {
    const tagged = createWorkflow({ id: 'tagged', tags: ['Cases'] });
    const casesTrigger = createWorkflow({
      id: 'trigger',
      triggerTypes: [CaseCreatedTriggerId],
    });

    expect(
      [tagged, casesTrigger].sort(createCaseWorkflowComparator([])).map(({ id }) => id)
    ).toEqual(['trigger', 'tagged']);
  });

  it('keeps tagged workflows first among name search matches', () => {
    const workflows = [
      createWorkflow({ id: 'other', name: 'matching other' }),
      createWorkflow({ id: 'tagged', name: 'matching tagged', tags: ['Cases'] }),
      createWorkflow({ id: 'not-a-match', name: 'different', tags: ['Cases'] }),
    ];

    const searchResults = workflows
      .sort(createCaseWorkflowComparator(['Cases']))
      .filter(({ name }) => name.includes('matching'))
      .map(({ id }) => id);

    expect(searchResults).toEqual(['tagged', 'other']);
  });
});
