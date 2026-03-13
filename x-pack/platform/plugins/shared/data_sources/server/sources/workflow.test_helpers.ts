/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { DataSource } from '@kbn/data-catalog-plugin';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { createToolRegistryMock } from '@kbn/agent-builder-plugin/server/test_utils/tools';
import { validateWorkflowYaml } from '@kbn/workflows-management-plugin/common/lib/validate_workflow_yaml';
import { WORKFLOW_ZOD_SCHEMA } from '@kbn/workflows-management-plugin/common/schema';
import type { WorkflowRunFixture } from '@kbn/workflows-execution-engine/integration_tests/workflow_run_fixture';
import { ServerStepRegistry } from '@kbn/workflows-extensions/server/step_registry/step_registry';
import { registerInternalStepDefinitions } from '@kbn/workflows-extensions/server/steps';
import { APPROVED_STEP_DEFINITIONS } from '@kbn/workflows-extensions/test/scout/api/fixtures/approved_step_definitions';
import { createDataSourceAndRelatedResources } from '../routes/data_sources_helpers';

const internalRegistry = new ServerStepRegistry();
registerInternalStepDefinitions({} as any, internalRegistry);

const CORE_STEPS = new Map<string, { id: string; handler: Function }>(
  internalRegistry.getAll().map((def) => [def.id, def])
);

const approvedStepIds = new Set(APPROVED_STEP_DEFINITIONS.map((d) => d.id));

/**
 * Populates a WorkflowRunFixture with custom step definitions.
 *
 * All workflows_extensions core steps (data.*, ai.*) are registered
 * automatically with their real production handlers.
 *
 * Steps from other plugins (search.rerank, cases.*, ai.agent) are recognised
 * as valid custom step types (via APPROVED_STEP_DEFINITIONS) so the engine
 * routes them correctly, but invoking one without a handler provided via
 * additionalSteps will fail with a clear message telling you what to do.
 */
export function registerExtensionSteps(
  fixture: WorkflowRunFixture,
  additionalSteps?: Array<{ id: string; handler: Function }>
) {
  const steps = new Map(CORE_STEPS);
  for (const step of additionalSteps ?? []) {
    steps.set(step.id, step);
  }

  (fixture.dependencies.workflowsExtensions.hasStepDefinition as jest.Mock).mockImplementation(
    (type: string) => steps.has(type) || approvedStepIds.has(type)
  );
  (fixture.dependencies.workflowsExtensions.getStepDefinition as jest.Mock).mockImplementation(
    (type: string) => {
      const def = steps.get(type);
      if (def) return def;
      if (approvedStepIds.has(type)) {
        return {
          id: type,
          handler: async () => {
            throw new Error(
              `Step "${type}" is a real production step but its handler is not available ` +
                `in this test context. Either import it from the plugin that owns it ` +
                `or provide a mock handler via the additionalSteps parameter.`
            );
          },
        };
      }
      return undefined;
    }
  );
}

export function getWorkflowYaml(workflows: ProcessedWorkflow[], nameSubstring: string): string {
  const wf = workflows.find((w) => w.name.includes(nameSubstring));
  if (!wf) {
    throw new Error(
      `No workflow found matching '${nameSubstring}'. Available: ${workflows
        .map((w) => w.name)
        .join(', ')}`
    );
  }
  return wf.yaml;
}

export interface ProcessedWorkflow {
  yaml: string;
  name: string;
  valid: boolean;
  liquidErrors: string[];
}

/**
 * Loads workflows for a data source through the real production path:
 *   createDataSourceAndRelatedResources → loadWorkflows → updateYamlField → createWorkflow
 *
 * This exercises the exact same code that runs when a user creates a data source
 * through the UI, including YAML serialization and template rendering. The only
 * mock is the storage layer (ES, saved objects, tools) — all YAML processing
 * uses real production code.
 */
export async function loadWorkflowsThroughProductionPath(
  dataSource: DataSource,
  options?: { stackConnectorId?: string; dataSourceName?: string }
): Promise<ProcessedWorkflow[]> {
  const stackConnectorId = options?.stackConnectorId ?? 'fake-connector-id';
  const dataSourceName = options?.dataSourceName ?? 'test-data-source';

  const capturedWorkflows: ProcessedWorkflow[] = [];

  const workflowManagement = {
    management: {
      createWorkflow: async ({ yaml }: { yaml: string }, _spaceId: string, _request: unknown) => {
        const validation = validateWorkflowYaml(yaml, WORKFLOW_ZOD_SCHEMA);
        const liquidErrors = validation.diagnostics
          .filter((d) => d.source === 'liquid')
          .map((d) => d.message);

        const parsedYaml = parse(yaml);
        const name = parsedYaml?.name ?? 'unknown';

        capturedWorkflows.push({ yaml, name, valid: validation.valid, liquidErrors });

        return {
          id: `workflow-${capturedWorkflows.length}`,
          name,
          yaml,
          valid: validation.valid,
          definition: validation.parsedWorkflow ?? null,
          enabled: parsedYaml?.enabled ?? false,
          createdBy: 'test',
          lastUpdatedBy: 'test',
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        };
      },
    },
  };

  const mockSavedObjectsClient = savedObjectsClientMock.create();
  mockSavedObjectsClient.getCurrentNamespace.mockReturnValue('default');
  mockSavedObjectsClient.create.mockResolvedValue({
    id: 'test-so-id',
    type: 'data-source',
    attributes: {},
    references: [],
  } as ReturnType<typeof mockSavedObjectsClient.create> extends Promise<infer T> ? T : never);

  const mockAgentBuilder = agentBuilderMocks.createStart();
  const mockToolRegistry = createToolRegistryMock();
  mockAgentBuilder.tools.getRegistry.mockResolvedValue(mockToolRegistry);
  mockToolRegistry.create.mockResolvedValue({ id: 'test-tool-id' } as any);

  const mockActionsClient = {
    execute: jest.fn().mockResolvedValue({
      status: 'ok',
      data: { tools: [] },
    }),
  };
  const mockActions = {
    getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
  };

  await createDataSourceAndRelatedResources({
    name: dataSourceName,
    type: dataSource.id,
    credentials: 'fake-credentials',
    stackConnectorId,
    savedObjectsClient: mockSavedObjectsClient,
    request: httpServerMock.createKibanaRequest(),
    logger: loggerMock.create(),
    workflowManagement: workflowManagement as any,
    actions: mockActions as any,
    dataSource,
    agentBuilder: mockAgentBuilder as any,
  });

  return capturedWorkflows;
}
