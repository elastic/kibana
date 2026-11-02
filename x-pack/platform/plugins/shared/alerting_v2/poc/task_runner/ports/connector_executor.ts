/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pod-build port: the real `ConnectorExecutor` (workflows_execution_engine/server/connector_executor.ts)
 * is imported unconditionally by the step graph, not lazily only when a connector step is hit, so
 * importing it for real drags the entire `@kbn/actions-plugin/server` implementation into every
 * Stage B1 pod. Connector execution is Stage B2's pod (see FINDINGS.md); this stub keeps the same
 * public shape but fails clearly instead of silently no-op'ing.
 */
export class ConnectorExecutor {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(_actionsClient: unknown) {}

  public async execute(): Promise<never> {
    throw new Error(
      'Stage B1 pod: connector steps are not bundled. Connector execution is Stage B2 (see FINDINGS.md).'
    );
  }

  public async executeSystemConnector(): Promise<never> {
    throw new Error(
      'Stage B1 pod: connector steps are not bundled. Connector execution is Stage B2 (see FINDINGS.md).'
    );
  }
}
