/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { PrimitiveNode, ViewRegistry } from '@kbn/adaptive-ui';
import type { KibanaPublicUrlHttp } from '../kibana_public_url';
import type { ResolveLiveViewDeps } from '../registered_views/resolve_live_view';
import { renderViewTool } from './render_view';
import { getAuthoringContextTool } from './get_authoring_context';
import { requestRegisteredViewTool } from './request_registered_view';
import { postViewToSlackTool } from './post_view_to_slack';

export { renderViewTool } from './render_view';
export { getAuthoringContextTool } from './get_authoring_context';
export { requestRegisteredViewTool } from './request_registered_view';
export { postViewToSlackTool } from './post_view_to_slack';

export interface AdaptiveUiToolsDeps extends ResolveLiveViewDeps {
  registry: ViewRegistry<unknown, PrimitiveNode>;
  /** Lazy getter for the Actions plugin start contract, used to post views to Slack. */
  getActions: () => Promise<ActionsPluginStart>;
  http: KibanaPublicUrlHttp;
}

export const registerAdaptiveUiTools = (
  agentBuilder: AgentBuilderPluginSetup,
  {
    registry,
    getActions,
    http,
    getSignificantEvents,
    getNightshiftInvestigations,
  }: AdaptiveUiToolsDeps
): void => {
  agentBuilder.tools.register(renderViewTool());
  agentBuilder.tools.register(getAuthoringContextTool());
  agentBuilder.tools.register(
    requestRegisteredViewTool({ registry, getSignificantEvents, getNightshiftInvestigations })
  );
  agentBuilder.tools.register(postViewToSlackTool({ getActions, http }));
};
