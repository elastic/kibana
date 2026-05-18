/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import YAML, { LineCounter, parseDocument } from 'yaml';
import { AgentExecutionMode, ToolType } from '@kbn/agent-builder-common';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { i18n } from '@kbn/i18n';
import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';
import {
  buildWorkflowLookup,
  isNestedStepKey,
  isWorkflowValidationError,
  NESTED_STEP_KEYS,
  type StepInfo,
  type WorkflowLookup,
} from '@kbn/workflows-yaml';
import { z } from '@kbn/zod/v4';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

/**
 * Lazy accessor for the workflows-extensions start contract. The plugin
 * declares workflows-extensions as an `optionalPlugin`; when it is not
 * available (or not yet started — e.g. in unit tests), the getter resolves
 * to `undefined` and pre-validation falls through silently.
 */
export type WorkflowsExtensionsGetter = () =>
  | Promise<WorkflowsExtensionsServerPluginStart | undefined>
  | WorkflowsExtensionsServerPluginStart
  | undefined;

export const WORKFLOW_EXECUTE_STEP_TOOL_ID = 'platform.workflows.workflow_execute_step';

export const SAFE_STEP_TYPES = new Set([
  'console',
  'data.set',
  'data.map',
  'data.filter',
  'data.find',
  'data.dedupe',
  'data.aggregate',
  'data.concat',
  'data.parseJson',
  'data.regexExtract',
  'data.regexReplace',
  'data.stringifyJson',
  'if',
  'foreach',
  'while',
  'wait',
  'elasticsearch.search',
  'elasticsearch.esql.query',
  'elasticsearch.indices.exists',
  'kibana.getCase',
  'kibana.streams.list',
  'kibana.streams.get',
  'kibana.streams.getSignificantEvents',
  'cases.getCase',
  'cases.getCases',
  'cases.findCases',
  'cases.findSimilarCases',
  'cases.getAllAttachments',
  'cases.getCasesByAlertId',
  // Slack read-only actions (.slack2 connector): query the Slack API without
  // posting messages or mutating workspace state.
  'slack2.searchMessages',
  'slack2.listChannels',
  'slack2.resolveChannelId',
]);

/**
 * Every unsafe step already requires human approval — the HITL dialog gates
 * execution regardless of step type. This list only adds emphasis: entries
 * render the confirm button with `color: 'danger'` instead of `'warning'`.
 */
const DESTRUCTIVE_STEP_TYPES = new Set([
  'elasticsearch.indices.delete',
  'cases.deleteCases',
  'cases.deleteObservable',
]);

const CONDITION_STEP_TYPES = new Set(['if', 'while']);

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30_000;
const STUB_SEQUENCE_KEYS = ['steps', 'else', 'fallback'] as const;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const findWorkflowYamlAttachment = (
  context: ToolHandlerContext
): { yaml: string; workflowId?: string } | null => {
  const activeAttachments = context.attachments.getActive();
  const yamlAttachment = activeAttachments.find((a) => a.type === WORKFLOW_YAML_ATTACHMENT_TYPE);
  if (!yamlAttachment) return null;

  const latestVersion = yamlAttachment.versions[yamlAttachment.versions.length - 1];
  if (!latestVersion) return null;

  const data = latestVersion.data as { yaml?: string; workflowId?: string };
  if (!data?.yaml) return null;

  return { yaml: data.yaml, workflowId: data.workflowId };
};

const buildLookup = (yaml: string): WorkflowLookup => {
  const lineCounter = new LineCounter();
  const doc = parseDocument(yaml, { lineCounter });
  return buildWorkflowLookup(doc, lineCounter);
};

export interface YamlParseFailure {
  /** Human-readable error message from the YAML parser. */
  message: string;
  /** 1-based line number of the offending token, when known. */
  line?: number;
  /** 1-based column of the offending token, when known. */
  column?: number;
  /** Source line plus a caret marker pointing at the column, when known. */
  snippet?: string;
}

/**
 * Returns a structured parse failure (line + column + snippet) so the LLM
 * can do a surgical retry instead of re-emitting the whole YAML. Returns
 * null if the document parses cleanly.
 */
const getYamlParseError = (yaml: string): YamlParseFailure | null => {
  try {
    const doc = parseDocument(yaml);
    if (doc.errors.length > 0) {
      const err = doc.errors[0];
      // YAMLError.linePos is `[start, end]`; both carry { line, col } (1-based).
      const linePos = (err as { linePos?: Array<{ line: number; col: number }> }).linePos?.[0];
      const lines = yaml.split('\n');
      const line = linePos?.line;
      const column = linePos?.col;
      const snippet =
        line !== undefined && line >= 1 && line <= lines.length
          ? `${lines[line - 1]}\n${' '.repeat(Math.max(0, (column ?? 1) - 1))}^`
          : undefined;
      return { message: err.message, line, column, snippet };
    }
    return null;
  } catch (error) {
    return { message: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * Collects all descendant step IDs of a given step using parentStepId links.
 */
const getDescendantStepIds = (stepId: string, allSteps: Record<string, StepInfo>): string[] => {
  const descendants: string[] = [];
  for (const [id, info] of Object.entries(allSteps)) {
    if (info.parentStepId === stepId) {
      descendants.push(id);
      descendants.push(...getDescendantStepIds(id, allSteps));
    }
  }
  return descendants;
};

/**
 * A step is safe only if its own type and every descendant's type are in SAFE_STEP_TYPES.
 * Returns the first unsafe step found (self or descendant), or null if fully safe.
 */
const findUnsafeStep = (stepId: string, allSteps: Record<string, StepInfo>): StepInfo | null => {
  const step = allSteps[stepId];
  if (!step) return null;

  if (!SAFE_STEP_TYPES.has(step.stepType)) return step;

  const descendantIds = getDescendantStepIds(stepId, allSteps);
  for (const id of descendantIds) {
    const descendant = allSteps[id];
    if (descendant && !SAFE_STEP_TYPES.has(descendant.stepType)) {
      return descendant;
    }
  }

  return null;
};

/**
 * Ensures inline YAML has the minimum fields required for workflow validation
 * (version, name, triggers). Adds defaults for any missing required fields.
 */
const ensureMinimalWorkflow = (yamlStr: string): string => {
  const doc = parseDocument(yamlStr);
  if (!YAML.isMap(doc.contents) || doc.errors.length > 0) {
    return yamlStr;
  }

  const contents = doc.contents as YAML.YAMLMap;
  if (!contents.get('version')) {
    contents.set(doc.createNode('version'), doc.createNode('1'));
  }
  if (!contents.get('name')) {
    contents.set(doc.createNode('name'), doc.createNode('_execute_step_test'));
  }
  if (!contents.get('triggers')) {
    contents.set(doc.createNode('triggers'), doc.createNode([{ type: 'manual' }]));
  }
  return doc.toString();
};

/**
 * Replaces all child steps of a container step (if/while) with safe console stubs
 * so the condition can be tested without executing unsafe children.
 */
const stubUnsafeChildren = (yamlStr: string, stepName: string): string => {
  const doc = parseDocument(yamlStr);
  if (!YAML.isMap(doc.contents)) {
    return yamlStr;
  }
  const stepsNode = (doc.contents as YAML.YAMLMap).get('steps');
  if (!YAML.isSeq(stepsNode)) {
    return yamlStr;
  }

  const stubStep = (branch: string) =>
    doc.createNode({
      name: `__stub_${branch}`,
      type: 'console',
      with: { message: `condition_test: ${branch} branch taken` },
    });

  const replaceBranch = (node: YAML.YAMLMap, key: (typeof STUB_SEQUENCE_KEYS)[number]) => {
    const child = node.get(key);
    if (YAML.isSeq(child)) {
      const stubSeq = doc.createNode([]);
      (stubSeq as YAML.YAMLSeq).add(stubStep(key === 'steps' ? 'then' : key));
      node.set(key, stubSeq);
    }
  };

  const replaceNestedFailureBranches = (node: YAML.YAMLMap | YAML.YAMLSeq) => {
    if (YAML.isSeq(node)) {
      for (const item of node.items) {
        if (YAML.isMap(item) || YAML.isSeq(item)) {
          replaceNestedFailureBranches(item);
        }
      }
      return;
    }

    replaceBranch(node, 'fallback');

    for (const pair of node.items) {
      if (YAML.isPair(pair) && YAML.isScalar(pair.key)) {
        const key = pair.key.value;
        if (
          isNestedStepKey(key) &&
          key !== 'fallback' &&
          (YAML.isMap(pair.value) || YAML.isSeq(pair.value))
        ) {
          replaceNestedFailureBranches(pair.value);
        }
      }
    }
  };

  const replaceChildren = (node: YAML.YAMLMap) => {
    for (const key of ['steps', 'else'] as const) {
      replaceBranch(node, key);
    }

    for (const key of ['on-failure', 'iteration-on-failure'] as const) {
      const child = node.get(key);
      if (YAML.isMap(child) || YAML.isSeq(child)) {
        replaceNestedFailureBranches(child);
      }
    }

    replaceBranch(node, 'fallback');
  };

  const findAndReplaceNode = (node: YAML.YAMLMap | YAML.YAMLSeq): boolean => {
    if (YAML.isSeq(node)) {
      for (const item of node.items) {
        if ((YAML.isMap(item) || YAML.isSeq(item)) && findAndReplaceNode(item)) {
          return true;
        }
      }
      return false;
    }

    const name = node.get('name');
    if (name === stepName) {
      replaceChildren(node);
      return true;
    }

    for (const key of NESTED_STEP_KEYS) {
      const child = node.get(key);
      if ((YAML.isMap(child) || YAML.isSeq(child)) && findAndReplaceNode(child)) {
        return true;
      }
    }

    return false;
  };

  findAndReplaceNode(stepsNode);
  return doc.toString();
};

const formatToolError = (error: unknown) => {
  if (error instanceof Error && isWorkflowValidationError(error)) {
    return {
      success: false,
      error: error.message,
      ...(error.validationErrors ? { validationErrors: error.validationErrors } : {}),
    };
  }

  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
  };
};

const createToolResult = (data: Record<string, unknown>) => ({
  results: [
    {
      type: 'other' as const,
      data,
    },
  ],
});

const executeAndPollStep = async ({
  api,
  yaml,
  stepName,
  workflowId,
  contextOverride,
  spaceId,
  request,
}: {
  api: WorkflowsManagementApi;
  yaml: string;
  stepName: string;
  workflowId?: string;
  contextOverride?: Record<string, unknown>;
  spaceId: string;
  request: ToolHandlerContext['request'];
}) => {
  const executionId = await api.testStep(
    yaml,
    stepName,
    workflowId,
    undefined,
    contextOverride ?? {},
    spaceId,
    request
  );

  const result = await pollExecution(api, executionId, stepName, spaceId);

  return { executionId, result };
};

const formatExecutionResult = ({
  executionId,
  result,
}: {
  executionId: string;
  result: Awaited<ReturnType<typeof pollExecution>>;
}) => ({
  success: result.status === ExecutionStatus.COMPLETED,
  executionId,
  status: result.status,
  ...(result.output !== undefined ? { output: result.output } : {}),
  ...(result.error !== undefined ? { error: result.error } : {}),
  ...(result.duration != null ? { duration: result.duration } : {}),
});

const getUnsafeStepValidation = async ({
  api,
  yaml,
  spaceId,
  request,
}: {
  api: WorkflowsManagementApi;
  yaml: string;
  spaceId: string;
  request: ToolHandlerContext['request'];
}): Promise<{ valid: boolean; errors?: string[] } | undefined> => {
  try {
    const result = await api.validateWorkflow(yaml, spaceId, request);
    if (result.valid) {
      return { valid: true };
    }

    const errors = result.diagnostics
      .filter((d) => d.severity === 'error')
      .map((d) => `[${d.source}] ${d.message}${d.path ? ` (at ${d.path.join('.')})` : ''}`);
    return { valid: false, errors };
  } catch {
    return undefined;
  }
};

const executeConditionStepWithStubs = async ({
  api,
  yaml,
  stepName,
  workflowId,
  contextOverride,
  context,
}: {
  api: WorkflowsManagementApi;
  yaml: string;
  stepName: string;
  workflowId?: string;
  contextOverride?: Record<string, unknown>;
  context: ToolHandlerContext;
}) => {
  try {
    const { executionId, result } = await executeAndPollStep({
      api,
      yaml: stubUnsafeChildren(yaml, stepName),
      stepName,
      workflowId,
      contextOverride,
      spaceId: context.spaceId,
      request: context.request,
    });

    return createToolResult({
      conditionTest: true,
      ...formatExecutionResult({ executionId, result }),
      hint: 'Unsafe child steps were replaced with safe stubs to test the condition. Check the output to see which branch was taken.',
    });
  } catch (error) {
    return createToolResult(formatToolError(error));
  }
};

const buildFallbackPreview = (
  stepInfo: StepInfo,
  unsafeStep: StepInfo,
  contextOverride?: Record<string, unknown>
): string => {
  const lines: string[] = [
    i18n.translate('workflows.agentBuilder.executeStep.fallbackPreview.step', {
      defaultMessage: '**Step:** `{stepId}`',
      values: { stepId: stepInfo.stepId },
    }),
    i18n.translate('workflows.agentBuilder.executeStep.fallbackPreview.type', {
      defaultMessage: '**Type:** `{stepType}`',
      values: { stepType: stepInfo.stepType },
    }),
  ];
  if (unsafeStep.stepId !== stepInfo.stepId) {
    lines.push(
      i18n.translate('workflows.agentBuilder.executeStep.fallbackPreview.unsafeDescendant', {
        defaultMessage: '**Unsafe descendant:** `{stepId}` (`{stepType}`)',
        values: { stepId: unsafeStep.stepId, stepType: unsafeStep.stepType },
      })
    );
  }
  if (contextOverride && Object.keys(contextOverride).length > 0) {
    const keys = Object.keys(contextOverride).join(', ');
    lines.push(
      i18n.translate('workflows.agentBuilder.executeStep.fallbackPreview.contextOverrideKeys', {
        defaultMessage: '**Context override keys:** {keys}',
        values: { keys },
      })
    );
  }
  lines.push(
    '',
    i18n.translate('workflows.agentBuilder.executeStep.fallbackPreview.body', {
      defaultMessage:
        'This step has external side effects. Review the workflow YAML before confirming.',
    })
  );
  return lines.join('\n');
};

const createUnsafeStepResult = async ({
  api,
  yaml,
  stepName,
  stepInfo,
  unsafeStep,
  context,
}: {
  api: WorkflowsManagementApi;
  yaml: string;
  stepName: string;
  stepInfo: StepInfo;
  unsafeStep: StepInfo;
  context: ToolHandlerContext;
}) => {
  const validation = await getUnsafeStepValidation({
    api,
    yaml,
    spaceId: context.spaceId,
    request: context.request,
  });

  const isChildUnsafe = unsafeStep.stepId !== stepName;
  const reason = isChildUnsafe
    ? `Step "${stepName}" contains child step "${unsafeStep.stepId}" (type "${unsafeStep.stepType}") which has external side effects`
    : `Step type "${unsafeStep.stepType}" has external side effects and cannot be auto-executed`;

  return createToolResult({
    blocked: true,
    reason,
    stepType: stepInfo.stepType,
    unsafeStepType: unsafeStep.stepType,
    ...(isChildUnsafe ? { unsafeChildStepId: unsafeStep.stepId } : {}),
    ...(validation ? { validation } : {}),
    hint: 'Ask the user to test this step manually using the "Run step" button in the editor.',
  });
};

const pollExecution = async (
  api: WorkflowsManagementApi,
  executionId: string,
  stepName: string,
  spaceId: string
): Promise<{
  status: string;
  output?: unknown;
  error?: unknown;
  duration?: number | null;
}> => {
  const startTime = Date.now();

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    await delay(POLL_INTERVAL_MS);

    const execution = await api.getWorkflowExecution(executionId, spaceId, {
      includeOutput: true,
    });

    if (!execution) {
      return { status: 'not_found', error: `Execution ${executionId} not found` };
    }

    if (TerminalExecutionStatuses.includes(execution.status as ExecutionStatus)) {
      const targetStepExecution = execution.stepExecutions?.find((se) => se.stepId === stepName);

      return {
        status: execution.status,
        output: targetStepExecution ?? undefined,
        error: execution.error ?? undefined,
        duration: execution.duration,
      };
    }
  }

  return {
    status: 'timeout',
    error: `Step execution did not complete within ${
      POLL_TIMEOUT_MS / 1000
    }s. The execution may still be running.`,
  };
};

export interface StepSchemaIssue {
  /** Dot/bracket path inside the step's `with:` block (e.g. `endpoint_id`, `query.bool.must[0]`). */
  path: string;
  /** Zod issue code (e.g. `invalid_type`, `unrecognized_keys`). */
  code: string;
  /** Human-readable message produced by Zod. */
  message: string;
  /** Expected type when known (Zod populates this for `invalid_type`). */
  expected?: string;
  /** Actual value's type when known. */
  received?: string;
}

export interface StepValidationFailure {
  /** The step type id the step claims to be (e.g. `data.search`). */
  stepType: string;
  /** Top-level failure reason — the registry might not know this step, or the schema rejected the `with:`. */
  reason: 'unknown_step_type' | 'with_schema_invalid';
  /** Schema issues populated when `reason === 'with_schema_invalid'`. */
  schemaErrors?: StepSchemaIssue[];
  /** Convenience message suitable for an LLM-facing `error` field. */
  message: string;
}

/**
 * Matches `{{ … }}` template references anywhere in a string. The execution
 * engine resolves these at runtime via the workflow context manager.
 */
const MUSTACHE_REF_PATTERN = /\{\{[^}]+\}\}/;

/**
 * Recursively scans `value` for any string containing a Mustache template
 * reference. Returns `true` as soon as one is found. Used by
 * `preValidateStepWith` to decide whether to skip static Zod validation —
 * pre-validation can't see through templates and would emit false-positive
 * schema errors on chained workflows where downstream values come from
 * earlier steps / inputs / context.
 */
function containsMustacheRef(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return MUSTACHE_REF_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(containsMustacheRef);
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(containsMustacheRef);
  }
  return false;
}

/**
 * Best-effort pre-execution validation of a step's `with:` block. Returns
 * `null` when:
 *   - the workflows-extensions registry is unavailable (e.g. unit tests),
 *   - the step type has no registered `inputSchema`,
 *   - the `with:` block contains any Mustache template ref (`{{ … }}`) — the
 *     execution engine resolves these at runtime; Zod can't see through them
 *     and would emit false-positive schema errors on chained workflows, or
 *   - the `with:` block parses cleanly.
 *
 * Returns a structured failure when the `with:` block fails Zod parsing on
 * literal values. The caller is expected to short-circuit before the
 * (expensive) execution-engine round-trip so the LLM gets the schema
 * diagnosis cheaply.
 *
 * NOTE: This is intentionally a SOFT gate. The Mustache skip means a step
 * that mixes literals and templates (`size: 10, query: "{{ inputs.q }}"`)
 * loses pre-validation on the literal half too. The trade-off is correctness
 * over coverage — false positives on chained workflows are far more painful
 * than missed pre-validation on a templated step (the execution engine still
 * validates the resolved values).
 */
export async function preValidateStepWith(
  yaml: string,
  stepName: string,
  stepType: string,
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined
): Promise<StepValidationFailure | null> {
  if (!workflowsExtensions) {
    return null;
  }

  const definition = workflowsExtensions.getStepDefinition(stepType);
  if (!definition) {
    // The workflowsExtensions registry only covers step types plugins have
    // explicitly registered (data.*, ai.*, plus skill-specific steps like
    // renderAlertNarrative). The execution engine itself knows several
    // hundred more (connector-derived steps such as `kibana.request`,
    // `elasticsearch.search`, `cases.*`, `slack2.*`, etc.). Treating
    // "missing from workflowsExtensions" as `unknown_step_type` produces
    // false positives that block valid steps. Skip pre-validation in that
    // case and let the execution engine surface any genuine errors.
    return null;
  }
  if (!definition.inputSchema) {
    return null;
  }

  let withBlock: unknown;
  try {
    const parsed = YAML.parse(yaml) as { steps?: unknown[] } | undefined;
    withBlock = extractWithBlock(parsed?.steps, stepName);
  } catch {
    // YAML errors are reported separately via `getYamlParseError`; if we
    // somehow reach this point with a malformed doc, just skip validation.
    return null;
  }

  // Mustache template refs (`{{ steps.prev.output.id }}`, `{{ inputs.q }}`,
  // `{{ consts.foo }}`, …) are resolved by the execution engine at run time.
  // Zod can't see through them and would reject the literal string when the
  // schema expects a non-string type (array, number, object, …). Skip
  // pre-validation entirely when ANY templated value is present; the
  // execution engine will validate the resolved payload.
  if (containsMustacheRef(withBlock)) {
    return null;
  }

  const result = definition.inputSchema.safeParse(withBlock ?? {});
  if (result.success) {
    return null;
  }

  const schemaErrors: StepSchemaIssue[] = result.error.issues.map((issue) => ({
    path: issue.path.map(String).join('.') || '<root>',
    code: issue.code,
    message: issue.message,
    expected: (issue as { expected?: string }).expected,
    received: (issue as { received?: string }).received,
  }));

  return {
    stepType,
    reason: 'with_schema_invalid',
    schemaErrors,
    message: `Step "${stepName}" (${stepType}) has ${schemaErrors.length} schema error${
      schemaErrors.length === 1 ? '' : 's'
    } in \`with:\`. Fix only the listed paths.`,
  };
}

/**
 * Walks the parsed YAML steps tree to find a step by name and returns its
 * `with:` value. Returns `undefined` if the step isn't found or the `with:`
 * field is missing.
 */
function extractWithBlock(steps: unknown, stepName: string): unknown {
  if (!Array.isArray(steps)) return undefined;
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    const stepObj = step as Record<string, unknown>;
    if (stepObj.name === stepName) {
      return stepObj.with;
    }
    for (const nestedKey of NESTED_STEP_KEYS) {
      if (isNestedStepKey(nestedKey)) {
        const nested = stepObj[nestedKey];
        const found = extractWithBlock(nested, stepName);
        if (found !== undefined) {
          return found;
        }
      }
    }
  }
  return undefined;
}

export function registerWorkflowExecuteStepTool(
  agentBuilder: AgentBuilderPluginSetup,
  api: WorkflowsManagementApi,
  getWorkflowsExtensions: WorkflowsExtensionsGetter = () => undefined
): void {
  // Cache the resolution promise so the start contract is fetched at most once
  // per tool registration, regardless of how many tool invocations happen.
  let workflowsExtensionsPromise:
    | Promise<WorkflowsExtensionsServerPluginStart | undefined>
    | undefined;
  const resolveWorkflowsExtensions = (): Promise<
    WorkflowsExtensionsServerPluginStart | undefined
  > => {
    if (!workflowsExtensionsPromise) {
      workflowsExtensionsPromise = Promise.resolve(getWorkflowsExtensions()).catch(() => undefined);
    }
    return workflowsExtensionsPromise;
  };

  agentBuilder.tools.register({
    id: WORKFLOW_EXECUTE_STEP_TOOL_ID,
    type: ToolType.builtin,
    description: `Execute a single workflow step against the real environment.

Emit only the \`steps:\` block (and any anchored fragments it references). The envelope (\`version\`, \`name\`, \`enabled: false\`, \`triggers: [{ type: manual }]\`) is added automatically if you omit it — sending it just inflates tokens.

YAML parse errors return a structured \`parseError\` carrying \`line\`, \`column\`, and a snippet with a caret marker. Use it to fix the exact offending token rather than re-emitting the whole document.

Schema errors on the step's \`with:\` block are returned BEFORE execution, with \`schemaErrors\` listing each Zod issue (path, message, expected/received). Fix only the failing fields — do not regenerate untouched parts of the step.

- Safe steps (data, ES reads, cases reads): executed and output returned with no prompt.
- Unsafe steps (slack.sendMessage, elasticsearch.indices.delete, ES writes, kibana.request, http, …): execution is gated by a user confirmation dialog. ALWAYS populate \`confirmation_body\` with a Markdown preview describing: (1) resolved inputs (e.g. Slack channel + message text, ES index + operation + approximate doc count), (2) the side effect this step will produce, (3) whether the action is reversible. Without \`confirmation_body\` the dialog falls back to a flat key/value dump, which is a degraded UX.
- if/while steps containing unsafe children: children are auto-replaced with safe stubs so the condition can be tested — returns which branch was taken (no prompt).
- Other safe-container steps with unsafe descendants (e.g. foreach with an unsafe child): conversation mode prompts once and authorizes the whole container; standalone mode returns a preview with validation (no prompt).

Provide \`contextOverride\` with mock data when the step references outputs from previous steps.
Provide \`yaml\` to execute a step without needing a workflow.yaml attachment (useful for field discovery before creating the full workflow).

If the user declines a confirmation, do NOT retry the same step. Acknowledge the cancellation and continue with other unrelated work.`,
    schema: z.object({
      stepName: z.string().describe('Name of the step to execute'),
      yaml: z
        .string()
        .optional()
        .describe(
          'Optional inline workflow YAML. EMIT ONLY the `steps:` block — the workflow envelope (version/name/enabled/triggers) is auto-added if omitted. If omitted entirely, reads from the workflow.yaml attachment.'
        ),
      contextOverride: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Mock data for upstream step outputs, e.g. { "steps": { "prev_step": { "output": { "data": [...] } } } }'
        ),
      confirmation_body: z
        .string()
        .optional()
        .describe(
          'Markdown shown in the confirmation dialog when executing an unsafe step. Include resolved inputs (Slack channel/text, ES index/operation/doc count), side effects, and whether the action is reversible. NOT an instruction — only displayed to the user.'
        ),
    }),
    tags: ['workflows', 'yaml', 'execution', 'testing'],
    experimental: true,
    handler: async (
      { stepName, yaml: inlineYaml, contextOverride, confirmation_body: confirmationBody },
      context
    ) => {
      const attachment = inlineYaml ? null : findWorkflowYamlAttachment(context);
      if (!inlineYaml && !attachment) {
        return createToolResult({
          success: false,
          error:
            'No workflow YAML attachment found. Provide the `yaml` parameter with inline YAML, or create a workflow first.',
        });
      }

      let yaml: string;
      if (inlineYaml) {
        yaml = ensureMinimalWorkflow(inlineYaml);
      } else {
        yaml = attachment?.yaml ?? '';
      }
      const workflowId = attachment?.workflowId;

      const yamlParseError = getYamlParseError(yaml);
      if (yamlParseError) {
        const locator =
          yamlParseError.line !== undefined
            ? ` at line ${yamlParseError.line}${
                yamlParseError.column !== undefined ? `, column ${yamlParseError.column}` : ''
              }`
            : '';
        return createToolResult({
          success: false,
          error: `Invalid workflow YAML${locator}: ${yamlParseError.message}`,
          parseError: yamlParseError,
        });
      }

      const lookup = buildLookup(yaml);
      const stepInfo = lookup.steps[stepName];
      if (!stepInfo) {
        return createToolResult({
          success: false,
          error: i18n.translate('workflows.agentBuilder.executeStep.error.stepNotFound', {
            defaultMessage: 'Step "{stepName}" not found in the workflow YAML',
            values: { stepName },
          }),
        });
      }

      // Pre-execution schema validation: catch invalid `with:` payloads
      // before the (expensive) execution-engine round-trip and before
      // prompting the user with a confirmation dialog.
      const validationFailure = await preValidateStepWith(
        yaml,
        stepName,
        stepInfo.stepType,
        await resolveWorkflowsExtensions()
      );
      if (validationFailure) {
        return createToolResult({
          success: false,
          error: validationFailure.message,
          stepType: validationFailure.stepType,
          reason: validationFailure.reason,
          ...(validationFailure.schemaErrors
            ? { schemaErrors: validationFailure.schemaErrors }
            : {}),
        });
      }

      const isStepUnsafe = !SAFE_STEP_TYPES.has(stepInfo.stepType);
      const unsafeStep = isStepUnsafe ? stepInfo : findUnsafeStep(stepName, lookup.steps);
      const isCondition = CONDITION_STEP_TYPES.has(stepInfo.stepType);

      // Conditions with unsafe descendants: stub the children and run the
      // condition, no prompt — execution stays side-effect-free.
      if (unsafeStep && isCondition && !isStepUnsafe && unsafeStep.stepId !== stepName) {
        return executeConditionStepWithStubs({
          api,
          yaml,
          stepName,
          workflowId,
          contextOverride,
          context,
        });
      }

      if (unsafeStep) {
        // Standalone (non-interactive) runs cannot prompt — fall back to the
        // existing preview-only result. This keeps background runs / evals /
        // A2A invocations friction-free.
        if (context.executionMode === AgentExecutionMode.standalone) {
          return createUnsafeStepResult({
            api,
            yaml,
            stepName,
            stepInfo,
            unsafeStep,
            context,
          });
        }

        const promptId = `${WORKFLOW_EXECUTE_STEP_TOOL_ID}.${context.callContext.toolCallId}`;
        const status = context.prompts.checkConfirmationStatus(promptId);

        if (status.status === ConfirmationStatus.rejected) {
          return createToolResult({
            success: false,
            error: i18n.translate('workflows.agentBuilder.executeStep.error.userDeclined', {
              defaultMessage: 'User declined to execute this step.',
            }),
          });
        }

        if (status.status === ConfirmationStatus.unprompted) {
          const isDestructive = DESTRUCTIVE_STEP_TYPES.has(unsafeStep.stepType);
          const isContainer = unsafeStep.stepId !== stepInfo.stepId;
          return context.prompts.askForConfirmation({
            id: promptId,
            title: isContainer
              ? i18n.translate('workflows.agentBuilder.executeStep.confirmation.titleContainer', {
                  defaultMessage:
                    'Execute step "{stepName}" ({stepType}) — contains unsafe `{unsafeStepId}` ({unsafeStepType})',
                  values: {
                    stepName,
                    stepType: stepInfo.stepType,
                    unsafeStepId: unsafeStep.stepId,
                    unsafeStepType: unsafeStep.stepType,
                  },
                })
              : i18n.translate('workflows.agentBuilder.executeStep.confirmation.title', {
                  defaultMessage: 'Execute step "{stepName}" ({stepType})',
                  values: { stepName, stepType: stepInfo.stepType },
                }),
            // `||` (not `??`) so empty-string `confirmation_body` falls back to
            // the generated preview instead of rendering a blank dialog body.
            message:
              confirmationBody || buildFallbackPreview(stepInfo, unsafeStep, contextOverride),
            confirm_text: i18n.translate(
              'workflows.agentBuilder.executeStep.confirmation.confirmText',
              { defaultMessage: 'Run step' }
            ),
            cancel_text: i18n.translate(
              'workflows.agentBuilder.executeStep.confirmation.cancelText',
              { defaultMessage: 'Cancel' }
            ),
            color: isDestructive ? 'danger' : 'warning',
          });
        }

        // accepted → fall through to execute below
      }

      try {
        const { executionId, result } = await executeAndPollStep({
          api,
          yaml,
          stepName,
          workflowId,
          contextOverride,
          spaceId: context.spaceId,
          request: context.request,
        });

        return createToolResult(formatExecutionResult({ executionId, result }));
      } catch (error) {
        return createToolResult(formatToolError(error));
      }
    },
  });
}
