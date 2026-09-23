/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ExecutionStatus } from '@kbn/workflows';
import { CREATE_PROPOSAL_WORKFLOW_ID, getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { WorkflowRunFixture } from '@kbn/workflows-execution-engine/test_helpers';
import type { Proposal } from '@kbn/proposals-common';
import type { ProposalDocument, ProposalsStorageClient } from '../server/storage/proposals_storage';
import { ProposalsService } from '../server/services/proposals_service';
import type { ProposalPrivilegesChecker } from '../server/services/check_proposal_privileges';
import { registerStepDefinitionsForTest } from './register_step_definitions_for_test';

/**
 * The real definition as shipped, so the test cannot drift from the YAML that
 * actually installs.
 *
 * Handed to the engine as-is, which matches how managed workflows install:
 * `lightweightValidation` does not validate steps, so the stored definition
 * keeps every key the YAML declares. What that does *not* catch is a key no
 * schema models — the engine may quietly ignore it while this fixture, and
 * every assertion over the raw YAML, still shows it present. The schema-parity
 * test next to the definition in `@kbn/workflows` is what closes that gap.
 */
export const gateWorkflowYaml = (): string => {
  const definition = getManagedWorkflowDefinition(CREATE_PROPOSAL_WORKFLOW_ID);
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error(`Managed definition ${CREATE_PROPOSAL_WORKFLOW_ID} has no yaml`);
  }
  return definition.yaml;
};

/**
 * Elasticsearch replaced by a Map, so the real `ProposalsService` runs with its
 * real guards — the valid decision/status pairs and the immutability checks are
 * exactly what a workflow can get wrong, so stubbing the service out would
 * remove the point of the test.
 */
const createInMemoryStorage = () => {
  const documents = new Map<string, { document: ProposalDocument; seqNo: number }>();
  let seqNo = 0;

  type Clause = Record<string, any>;

  /** Evaluates only the clause shapes the service's queries use, against one
   *  document — enough for `load` and `getLatestRevision`, not a query engine. */
  const matchesClause = (id: string, document: ProposalDocument, clause: Clause): boolean => {
    if (clause.ids) {
      return (clause.ids.values as string[]).includes(id);
    }
    if (clause.term) {
      const [field, value] = Object.entries(clause.term)[0] as [string, unknown];
      return (document as unknown as Record<string, unknown>)[field] === value;
    }
    if (clause.exists) {
      const field = clause.exists.field as string;
      return (document as unknown as Record<string, unknown>)[field] !== undefined;
    }
    throw new Error(`createInMemoryStorage: unsupported query clause ${JSON.stringify(clause)}`);
  };

  return {
    documents,
    client: {
      index: jest.fn(async ({ id, document }: { id: string; document: ProposalDocument }) => {
        documents.set(id, { document, seqNo: (seqNo += 1) });
        return { _id: id };
      }),
      search: jest.fn(async ({ query }: { query: unknown }) => {
        const bool = (query as { bool?: { filter?: Clause[]; must_not?: Clause[] } })?.bool ?? {};
        const filter = bool.filter ?? [];
        const mustNot = bool.must_not ?? [];
        const hits = [...documents.entries()]
          .filter(
            ([id, { document }]) =>
              filter.every((clause) => matchesClause(id, document, clause)) &&
              mustNot.every((clause) => !matchesClause(id, document, clause))
          )
          .map(([id, { document, seqNo: docSeqNo }]) => ({
            _id: id,
            _source: document,
            _seq_no: docSeqNo,
            _primary_term: 1,
          }));
        return { hits: { hits, total: { value: hits.length } } };
      }),
    } as unknown as ProposalsStorageClient,
  };
};

/** The gate's literal `timeout`, which is also the deadline on the record. */
const GATE_TIMEOUT_MS = 72 * 60 * 60 * 1000;

export interface ProposalGateFixture {
  engine: WorkflowRunFixture;
  /** Every proposal written so far, in insertion order. */
  proposals: () => Array<Proposal & { id: string }>;
  /** The only proposal, asserting there is exactly one. */
  onlyProposal: () => Proposal & { id: string };
  executionStatus: () => ExecutionStatus | undefined;
  /**
   * Step executions for a step id, oldest first. Pass `stepType` to exclude the
   * wrapper executions the engine records under the same id — a step covered by
   * an `on-failure` handler gets a `fallback` try-block execution alongside its
   * own.
   */
  stepExecutions: (
    stepId: string,
    stepType?: string
  ) => Array<{ status: string; stepType?: string; input?: unknown; output?: unknown }>;
  /** Runs the workflow to its first park (or to completion). */
  start: (inputs?: Record<string, unknown>) => Promise<void>;
  /** Answers the parked gate as a human would through a resume surface. */
  resume: (approved: boolean, respondedBy?: string) => Promise<void>;
  /** Revises the live proposal through the real service while the gate is parked. */
  revise: (overrides: { comment?: string; actionInput?: Record<string, unknown> }) => Promise<void>;
  /**
   * Wakes the parked gate past its deadline with no answer, which is what the
   * scheduled wake task does in production. The fixture's task manager mock has
   * no `ensureScheduled`, so the task is never really scheduled here and the
   * wake has to be driven by hand.
   */
  timeOutGate: () => Promise<void>;
  /** Flips what `proposals.checkDecidePrivileges` reports. */
  setCanDecide: (canDecide: boolean) => void;
  /** Replaces what the action workflow declares, e.g. to make it `always-gate`. */
  setActionMetadata: (actionMetadata: Record<string, unknown>) => void;
  /** Makes the action workflow unreadable, as a transient API failure would. */
  failActionLookup: () => void;
}

export const createProposalGateFixture = (): ProposalGateFixture => {
  const engine = new WorkflowRunFixture();
  const { documents, client } = createInMemoryStorage();
  let canDecide = true;

  const workflowsApi = {
    // Supplies the action metadata `create` and `get` resolve. No `triggers`,
    // so the best-effort action-input validation is skipped.
    getWorkflow: jest.fn().mockResolvedValue({
      definition: { consts: { actionMetadata: { name: 'Create rule', category: 'tune' } } },
    }),
    getWorkflowExecution: jest.fn(),
    resumeWorkflowExecution: jest.fn(),
  };

  const service = new ProposalsService({
    storage: client,
    logger: loggerMock.create(),
    getWorkflowsApi: () => workflowsApi as never,
    // The gate's behaviour does not depend on the conversation card, so the
    // attachment write is stubbed rather than simulated.
    getAttachmentsClient: async () => ({ create: jest.fn() } as never),
  });

  const privileges: ProposalPrivilegesChecker = {
    assertCanManage: async () => undefined,
    assertCanRead: async () => undefined,
    canManage: async () => canDecide,
  };

  registerStepDefinitionsForTest({
    engine,
    getProposalsService: () => service,
    privileges,
  });

  const proposals = () =>
    [...documents.entries()].map(
      ([id, { document }]) => ({ id, ...document } as Proposal & { id: string })
    );

  return {
    engine,
    proposals,
    onlyProposal: () => {
      const all = proposals();
      if (all.length !== 1) {
        throw new Error(`Expected exactly one proposal, found ${all.length}`);
      }
      return all[0];
    },
    executionStatus: () =>
      engine.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id')
        ?.status,
    stepExecutions: (stepId, stepType) =>
      [...engine.stepExecutionRepositoryMock.stepExecutions.values()]
        .filter((step) => step.stepId === stepId)
        .filter((step) => stepType === undefined || step.stepType === stepType)
        .sort((a, b) => (a.stepExecutionIndex ?? 0) - (b.stepExecutionIndex ?? 0)),
    start: async (inputs = {}) => {
      await engine.runWorkflow({
        workflowYaml: gateWorkflowYaml(),
        inputs: { conversationId: 'conv-1', comment: 'Tune the noisy rule', ...inputs },
      });
    },
    resume: async (approved, respondedBy = 'analyst') => {
      const execution = engine.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      )!;
      // The shape `waitForApproval` reduces a resume payload to. Anything else
      // a caller sends is discarded by the platform, which is why the route
      // has to write the dismiss reason itself.
      execution.context = {
        ...execution.context,
        resumeInput: { approved },
        resumedBy: respondedBy,
      };
      engine.workflowExecutionRepositoryMock.workflowExecutions.set(execution.id, execution);
      await engine.resumeWorkflow();
    },
    /**
     * Goes through the real service, the same path the tool and HTTP route take,
     * so a test can park a gate, revise under it, resume, and assert the revision
     * rather than the trigger's original input reaches `execute_action`.
     */
    revise: async (overrides: { comment?: string; actionInput?: Record<string, unknown> }) => {
      const [live] = proposals().filter((proposal) => proposal.supersededBy === undefined);
      await service.revise({ id: live.id, ...overrides }, live.spaceId ?? 'fake_space_id');
    },
    timeOutGate: async () => {
      // No `resumeInput`, which is the whole signal: the step reads the wait as
      // expired and fails itself with a `TimeoutError`.
      jest.useFakeTimers({ now: new Date(Date.now() + GATE_TIMEOUT_MS + 60_000) });
      try {
        await engine.resumeWorkflow();
      } finally {
        jest.useRealTimers();
      }
    },
    setCanDecide: (value) => {
      canDecide = value;
    },
    setActionMetadata: (actionMetadata) => {
      workflowsApi.getWorkflow.mockResolvedValue({ definition: { consts: { actionMetadata } } });
    },
    failActionLookup: () => {
      workflowsApi.getWorkflow.mockRejectedValue(new Error('workflows API unavailable'));
    },
  };
};
