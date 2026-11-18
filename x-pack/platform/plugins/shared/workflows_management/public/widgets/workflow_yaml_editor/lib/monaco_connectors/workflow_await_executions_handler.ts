/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/code-editor';
import { getBuiltInStepStability } from '@kbn/workflows';
import { BaseMonacoConnectorHandler } from './base_monaco_connector_handler';
import type { ConnectorExamples, HoverContext } from '../monaco_providers/provider_interfaces';

const WORKFLOW_AWAIT_EXECUTIONS_TYPE = 'workflow.awaitExecutions';

export class WorkflowAwaitExecutionsMonacoConnectorHandler extends BaseMonacoConnectorHandler {
  constructor() {
    super('WorkflowAwaitExecutionsMonacoConnectorHandler', 80, [WORKFLOW_AWAIT_EXECUTIONS_TYPE]);
  }

  canHandle(connectorType: string): boolean {
    return connectorType === WORKFLOW_AWAIT_EXECUTIONS_TYPE;
  }

  async generateHoverContent(context: HoverContext): Promise<monaco.IMarkdownString | null> {
    const { connectorType, stepContext } = context;
    if (!stepContext) {
      return null;
    }

    const content = this.prependStabilityBadgeToContent(getBuiltInStepStability(connectorType), [
      `**Step**: \`${connectorType}\``,
      '',
      'Wait for executions started by `workflow.executeAsync` to finish and collect their results.',
      '',
      '**Parameters** _(provide exactly one of `from-steps` or `execution-ids`)_:',
      '- `from-steps` — Names of earlier steps; every `workflow.executeAsync` run inside them is awaited, including all foreach iterations and parallel branches. Inside the same loop as the referenced step, only the current iteration is awaited; place the join after the loop to collect every iteration',
      '- `execution-ids` — Execution IDs or `workflow.executeAsync` outputs to await, for example IDs returned by a sub-workflow',
      '- `mode` _(optional)_ — `fail-fast` (default) fails on the first unsuccessful execution without cancelling the others; `settled` waits for all of them',
      '',
      'Only executions started by this run or by one of its sub-workflows can be awaited.',
      '',
      'Use the step `timeout` to limit how long to wait. The step waits at most 24 hours, even when the timeout is longer.',
      '',
      '**Example:**',
      '',
      '```yaml',
      `- name: join`,
      `  type: ${connectorType}`,
      `  timeout: 10m`,
      `  with:`,
      `    from-steps: [fan_out]`,
      `    mode: settled`,
      '```',
    ]);

    return this.createMarkdownContent(content);
  }

  getExamples(connectorType: string): ConnectorExamples | null {
    return {
      params: {
        'from-steps': ['fan_out'],
        mode: 'settled',
      },
      snippet: `- name: join\n  type: ${connectorType}\n  timeout: 10m\n  with:\n    from-steps: [fan_out]\n    mode: settled`,
    };
  }
}
