/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import {
  CREATE_PROPOSAL_WORKFLOW_ID,
  getManagedWorkflowDefinition,
  RESOLVE_PROPOSAL_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { WorkflowRunFixture } from '@kbn/workflows-execution-engine/test_helpers';
import type { Proposal, ProposalOrigin, ProposalStatus, ProposalUser } from '@kbn/proposals-common';
import type { ProposalDocument, ProposalsStorageClient } from '../server/storage/proposals_storage';
import { ProposalsService } from '../server/services/proposals_service';
import type { ProposalPrivilegesChecker } from '../server/services/check_proposal_privileges';
import type { ResolveProposalUser } from '../server/services/resolve_proposal_user';
import { registerStepDefinitionsForTest } from './register_step_definitions_for_test';

/**
 * A real definition as shipped, so the test cannot drift from the YAML that
 * actually installs.
 *
 * Handed to the engine as-is, which matches how managed workflows install:
 * `lightweightValidation` does not validate steps, so the stored definition
 * keeps every key the YAML declares. What that does *not* catch is a key no
 * schema models — the engine may quietly ignore it while this fixture, and
 * every assertion over the raw YAML, still shows it present. The schema-parity
 * test next to the definition in `@kbn/workflows` is what closes that gap.
 */
const managedWorkflowYaml = (workflowId: string): string => {
  const definition = getManagedWorkflowDefinition(workflowId);
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error(`Managed definition ${workflowId} has no yaml`);
  }
  return definition.yaml;
};

export const gateWorkflowYaml = (): string => managedWorkflowYaml(CREATE_PROPOSAL_WORKFLOW_ID);

/** The id `WorkflowRunFixture` gives every execution it runs. */
const FIXTURE_EXECUTION_ID = 'fake_workflow_execution_id';

const searchResponse = (hits: Array<Record<string, unknown>>) => ({
  took: 0,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { hits },
});

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
      index: jest.fn(
        async ({
          id,
          document,
          op_type,
        }: {
          id: string;
          document: ProposalDocument;
          op_type?: string;
        }) => {
          // Elasticsearch's own contract for `op_type: 'create'`, which a
          // caller-chosen id rests on: an id that already exists is refused,
          // never overwritten.
          if (op_type === 'create' && documents.has(id)) {
            throw Object.assign(new Error('version conflict'), { statusCode: 409 });
          }
          documents.set(id, { document, seqNo: (seqNo += 1) });
          return { _id: id };
        }
      ),
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

/** Required of every caller, but the gate never branches on it, so any member does. */
const FIXTURE_ORIGIN = 'alertzero' satisfies ProposalOrigin;

export interface ProposalGateFixture {
  engine: WorkflowRunFixture;
  /** The service the gate writes through, to read and decide as the routes do. */
  service: ProposalsService;
  attachedProposalIds: () => string[];
  /** Every proposal written so far, in insertion order. */
  proposals: () => Array<Proposal & { id: string }>;
  /** The only proposal, asserting there is exactly one. */
  onlyProposal: () => Proposal & { id: string };
  executionStatus: () => ExecutionStatus | undefined;
  /**
   * Step executions for a step id, across the gate and every resolution it ran,
   * oldest first within each. Pass `stepType` to exclude the wrapper executions
   * the engine records under the same id — a step covered by an `on-failure`
   * handler gets a `fallback` try-block execution alongside its own.
   */
  stepExecutions: (
    stepId: string,
    stepType?: string
  ) => Array<{
    status: string;
    stepType?: string;
    input?: unknown;
    output?: unknown;
    state?: Record<string, unknown>;
  }>;
  /**
   * The duration the parked gate will actually be held for — the rendered
   * `dynamicTimeout` frozen on step state at wait-entry, which is what the
   * idle wake-up and the resume check both read.
   */
  gateTimeout: () => string | undefined;
  /**
   * Creates a proposal through the real service, outside the workflow under
   * test: what another execution's gate has already done by the time this run
   * starts.
   */
  seedProposal: (params: { id?: string }) => Promise<{ id: string }>;
  /** Runs the workflow to its first park (or to completion). */
  start: (inputs?: Record<string, unknown>) => Promise<void>;
  /** Answers the parked gate as a human would through a resume surface. */
  resume: (approved: boolean, respondedBy?: string) => Promise<void>;
  /**
   * The same answer, arriving after the deadline. Reachable because the step
   * only treats a wake as expired when it carries no `resumeInput`, so a
   * resume through the platform API or the Inbox is accepted past the
   * deadline where the HTTP routes would refuse it. That is the only reason
   * `settle_expired_after_gate` exists.
   */
  resumeAfterDeadline: (approved: boolean, respondedBy?: string) => Promise<void>;
  /** Revises the live proposal through the real service while the gate is parked. */
  revise: (overrides: { comment?: string; actionInput?: Record<string, unknown> }) => Promise<void>;
  /**
   * Wakes the parked gate past its deadline with no answer, which is what the
   * scheduled wake task does in production. The fixture's task manager mock has
   * no `ensureScheduled`, so the task is never really scheduled here and the
   * wake has to be driven by hand.
   *
   * `advanceMs` overrides how far the clock jumps, for a gate parked against a
   * caller-supplied deadline rather than the 72h default.
   */
  timeOutGate: (advanceMs?: number) => Promise<void>;
  /**
   * Ends the parked gate as a cancel does, a parent's timeout cascading into it
   * for instance: the execution is marked cancelled and runs no handler, so
   * nothing in the workflow settles the record.
   */
  cancelGate: () => void;
  /** Flips what `proposals.checkDecidePrivileges` reports. */
  setCanDecide: (canDecide: boolean) => void;
  /** Sets the user the execution request resolves to, which the decision is attributed from. */
  setExecutingUser: (user: ProposalUser | undefined) => void;
  /** Fails the next privilege read, as a privilege service outage would. */
  failNextRead: () => void;
  /** Fails the next write of `status`, as a lost Elasticsearch write would. */
  failNextStatusWrite: (status: ProposalStatus) => void;
  /** Replaces what the action workflow declares, e.g. to make it `always-gate`. */
  setActionMetadata: (actionMetadata: Record<string, unknown>) => void;
  /** Makes the action workflow unreadable, as a transient API failure would. */
  failActionLookup: () => void;
}

export const createProposalGateFixture = (): ProposalGateFixture => {
  const engine = new WorkflowRunFixture();
  // The gate runs `system-resolve-proposal` as a sync child. This second engine
  // runs it for real, against the same proposal storage, so its writes are
  // what the gate reads afterwards.
  const resolveEngine = new WorkflowRunFixture();
  const { documents, client } = createInMemoryStorage();
  let canDecide = true;
  let executingUser: ProposalUser | undefined;
  let failingReads = 0;
  let failingStatus: ProposalStatus | undefined;

  const workflowsApi = {
    // Supplies the action metadata `create` and `get` resolve. No `triggers`,
    // so the best-effort action-input validation is skipped.
    getWorkflow: jest.fn().mockResolvedValue({
      definition: {
        consts: {
          actionMetadata: {
            name: 'Create rule',
            category: 'tune',
            approvalPolicy: 'autonomy-dependent',
          },
        },
      },
    }),
    // Both report the fixture engine's own executions, so a read or a decision
    // settles a proposal only when its gate really ended.
    getWorkflowExecution: jest.fn(async (id: string) => {
      const execution = engine.workflowExecutionRepositoryMock.workflowExecutions.get(id);
      return execution ? { ...execution, stepExecutions: [] } : null;
    }),
    getWorkflowExecutionStatuses: jest.fn(async (ids: string[]) =>
      ids.flatMap((id) => {
        const execution = engine.workflowExecutionRepositoryMock.workflowExecutions.get(id);
        return execution
          ? [{ id, workflowId: execution.workflowId, status: execution.status }]
          : [];
      })
    ),
    resumeWorkflowExecution: jest.fn(),
  };

  const attachedProposalIds: string[] = [];
  const service = new ProposalsService({
    storage: client,
    logger: loggerMock.create(),
    getWorkflowsApi: () => workflowsApi as never,
    // The gate's behaviour does not depend on the conversation card, so the
    // attachment write is stubbed rather than simulated.
    getAttachmentsClient: async () =>
      ({
        create: jest.fn(async ({ origin }: { origin: string }) => {
          attachedProposalIds.push(origin);
        }),
      } as never),
  });

  const update = service.update.bind(service);
  jest.spyOn(service, 'update').mockImplementation(async (params, spaceId) => {
    if (failingStatus !== undefined && params.status === failingStatus) {
      failingStatus = undefined;
      throw new Error(`Failed to write status ${params.status}`);
    }
    return update(params, spaceId);
  });

  const privileges: ProposalPrivilegesChecker = {
    assertCanManage: async () => undefined,
    assertCanRead: async () => {
      if (failingReads > 0) {
        failingReads -= 1;
        throw new Error('Privilege service unavailable');
      }
    },
    canManage: async () => canDecide,
  };
  const resolveUser: ResolveProposalUser = async () => executingUser;

  for (const target of [engine, resolveEngine]) {
    registerStepDefinitionsForTest({
      engine: target,
      getProposalsService: () => service,
      privileges,
      resolveUser,
    });
  }

  // The gate looks the child up by id; every other lookup finds nothing, so an
  // action workflow still fails to start, which is the branch worth exercising.
  const resolveWorkflowYaml = managedWorkflowYaml(RESOLVE_PROPOSAL_WORKFLOW_ID);
  jest
    .mocked(engine.dependencies.coreStart.elasticsearch.client.asInternalUser.search)
    .mockImplementation((async (params: unknown) =>
      searchResponse(
        JSON.stringify(params).includes(RESOLVE_PROPOSAL_WORKFLOW_ID)
          ? [
              {
                _index: '.workflows',
                _id: RESOLVE_PROPOSAL_WORKFLOW_ID,
                _source: {
                  name: 'Resolve proposal',
                  enabled: true,
                  valid: true,
                  managed: true,
                  yaml: resolveWorkflowYaml,
                  definition: parse(resolveWorkflowYaml),
                },
              },
            ]
          : []
      )) as never);

  const resolveStepExecutions: EsWorkflowStepExecution[] = [];
  let resolutions = 0;
  engine.workflowsExecutionEngineMock.executeWorkflow.mockImplementation(
    async (_workflow: unknown, { inputs }: { inputs?: Record<string, unknown> }) => {
      await resolveEngine.runWorkflow({ workflowYaml: resolveWorkflowYaml, inputs });
      const execution =
        resolveEngine.workflowExecutionRepositoryMock.workflowExecutions.get(FIXTURE_EXECUTION_ID)!;
      if (!isTerminalStatus(execution.status)) {
        throw new Error(
          `The resolution stopped as ${execution.status}, which nothing here resumes`
        );
      }
      resolveStepExecutions.push(
        ...resolveEngine.stepExecutionRepositoryMock.stepExecutions.values()
      );
      // Copied under an id of its own, where the gate's sync step reads it back.
      resolutions += 1;
      const workflowExecutionId = `resolve-proposal-${resolutions}`;
      engine.workflowExecutionRepositoryMock.workflowExecutions.set(workflowExecutionId, {
        ...execution,
        id: workflowExecutionId,
      });
      return { workflowExecutionId };
    }
  );

  const executionStatus = () =>
    engine.workflowExecutionRepositoryMock.workflowExecutions.get(FIXTURE_EXECUTION_ID)?.status;

  /**
   * The child has already finished by the time the gate parks on it, so one
   * wake-up per resolution is enough. Production wakes the gate the same way,
   * when the child completes.
   */
  const finishResolutions = async () => {
    for (
      let wake = 0;
      wake < 10 && executionStatus() === ExecutionStatus.WAITING_FOR_CHILD;
      wake++
    ) {
      await engine.resumeWorkflow();
    }
  };

  const proposals = () =>
    [...documents.entries()].map(
      ([id, { document }]) => ({ id, ...document } as Proposal & { id: string })
    );

  /** Stages the payload `waitForApproval` reduces a resume to, without waking the run. */
  const stageResume = (approved: boolean, respondedBy: string) => {
    const execution =
      engine.workflowExecutionRepositoryMock.workflowExecutions.get(FIXTURE_EXECUTION_ID)!;
    // The shape `waitForApproval` reduces a resume payload to. Anything else
    // a caller sends is discarded by the platform, which is why the route
    // has to write the dismiss reason itself.
    execution.context = { ...execution.context, resumeInput: { approved }, resumedBy: respondedBy };
    engine.workflowExecutionRepositoryMock.workflowExecutions.set(execution.id, execution);
  };

  return {
    engine,
    service,
    attachedProposalIds: () => [...attachedProposalIds],
    proposals,
    onlyProposal: () => {
      const all = proposals();
      if (all.length !== 1) {
        throw new Error(`Expected exactly one proposal, found ${all.length}`);
      }
      return all[0];
    },
    executionStatus,
    stepExecutions: (stepId, stepType) =>
      [...engine.stepExecutionRepositoryMock.stepExecutions.values(), ...resolveStepExecutions]
        .filter((step) => step.stepId === stepId)
        .filter((step) => stepType === undefined || step.stepType === stepType)
        .sort((a, b) => (a.stepExecutionIndex ?? 0) - (b.stepExecutionIndex ?? 0)),
    gateTimeout: () => {
      const parks = [...engine.stepExecutionRepositoryMock.stepExecutions.values()]
        .filter((step) => step.stepId === 'await_decision' && step.stepType === 'waitForApproval')
        .sort((a, b) => (a.stepExecutionIndex ?? 0) - (b.stepExecutionIndex ?? 0));
      const latest = parks[parks.length - 1];
      const dynamicTimeout = latest?.state?.dynamicTimeout;
      return typeof dynamicTimeout === 'string' ? dynamicTimeout : undefined;
    },
    seedProposal: async ({ id }) => {
      const created = await service.create(
        {
          conversationId: 'conv-other',
          comment: 'Seeded',
          origin: FIXTURE_ORIGIN,
          confidence: 'medium',
          id,
        },
        { spaceId: 'fake_space_id', request: httpServerMock.createKibanaRequest() }
      );
      return { id: created.id };
    },
    start: async (inputs = {}) => {
      resolveStepExecutions.length = 0;
      await engine.runWorkflow({
        workflowYaml: gateWorkflowYaml(),
        inputs: {
          conversationId: 'conv-1',
          comment: 'Tune the noisy rule',
          origin: FIXTURE_ORIGIN,
          ...inputs,
        },
      });
      await finishResolutions();
    },
    resume: async (approved, respondedBy = 'analyst') => {
      stageResume(approved, respondedBy);
      await engine.resumeWorkflow();
      await finishResolutions();
    },
    resumeAfterDeadline: async (approved, respondedBy = 'analyst') => {
      stageResume(approved, respondedBy);
      // Past the deadline, but carrying an answer — so the step accepts the
      // resume instead of failing the wait, and the loop's own post-gate
      // deadline check is what has to catch it.
      jest.useFakeTimers({ now: new Date(Date.now() + GATE_TIMEOUT_MS + 60_000) });
      try {
        await engine.resumeWorkflow();
        await finishResolutions();
      } finally {
        jest.useRealTimers();
      }
    },
    /**
     * Goes through the real service, the same path the tool and HTTP route take,
     * so a test can park a gate, revise under it, resume, and assert the revision
     * rather than the trigger's original input reaches `execute_as_approver`.
     */
    revise: async (overrides: { comment?: string; actionInput?: Record<string, unknown> }) => {
      const [live] = proposals().filter((proposal) => proposal.supersededBy === undefined);
      await service.revise(
        { id: live.id, ...overrides },
        live.spaceId ?? 'fake_space_id',
        httpServerMock.createKibanaRequest()
      );
    },
    timeOutGate: async (advanceMs = GATE_TIMEOUT_MS + 60_000) => {
      // No `resumeInput`, which is the whole signal: the step reads the wait as
      // expired and fails itself with a `TimeoutError`.
      jest.useFakeTimers({ now: new Date(Date.now() + advanceMs) });
      try {
        await engine.resumeWorkflow();
      } finally {
        jest.useRealTimers();
      }
    },
    cancelGate: () => {
      const executions = engine.workflowExecutionRepositoryMock.workflowExecutions;
      const execution = executions.get(FIXTURE_EXECUTION_ID)!;
      executions.set(execution.id, { ...execution, status: ExecutionStatus.CANCELLED });
    },
    setCanDecide: (value) => {
      canDecide = value;
    },
    setExecutingUser: (user) => {
      executingUser = user;
    },
    failNextRead: () => {
      failingReads += 1;
    },
    failNextStatusWrite: (status) => {
      failingStatus = status;
    },
    setActionMetadata: (actionMetadata) => {
      workflowsApi.getWorkflow.mockResolvedValue({ definition: { consts: { actionMetadata } } });
    },
    failActionLookup: () => {
      workflowsApi.getWorkflow.mockRejectedValue(new Error('workflows API unavailable'));
    },
  };
};
