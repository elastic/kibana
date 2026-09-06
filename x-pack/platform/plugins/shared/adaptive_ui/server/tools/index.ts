/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { PrimitiveNode, ViewRegistry } from '@kbn/adaptive-ui';
import { renderViewTool } from './render_view';
import { getAuthoringContextTool } from './get_authoring_context';
import { requestRegisteredViewTool } from './request_registered_view';

export { renderViewTool } from './render_view';
export { getAuthoringContextTool } from './get_authoring_context';
export { requestRegisteredViewTool } from './request_registered_view';

export interface AdaptiveUiToolsDeps {
  registry: ViewRegistry<unknown, PrimitiveNode>;
}

export const registerAdaptiveUiTools = (
  agentBuilder: AgentBuilderPluginSetup,
  { registry }: AdaptiveUiToolsDeps
): void => {
  agentBuilder.tools.register(renderViewTool());
  agentBuilder.tools.register(getAuthoringContextTool());
  agentBuilder.tools.register(requestRegisteredViewTool({ registry }));
};
