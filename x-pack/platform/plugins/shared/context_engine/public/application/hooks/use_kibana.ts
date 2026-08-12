/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ChatOpener, ContextEngineStartDependencies } from '../../types';

export interface ContextEngineServices extends CoreStart {
  agentBuilder?: AgentBuilderPluginStart;
  data: ContextEngineStartDependencies['data'];
  share: ContextEngineStartDependencies['share'];
  triggersActionsUi: ContextEngineStartDependencies['triggersActionsUi'];
  console?: ContextEngineStartDependencies['console'];
  spaces?: ContextEngineStartDependencies['spaces'];
  /**
   * Getter for the registered "Analyze & improve" chat opener, resolved at call time (`undefined`
   * when none is registered). A getter rather than the resolved value so an opener registered after
   * mount is picked up on the next render.
   */
  getChatOpener?: () => ChatOpener | undefined;
}

const useTypedKibana = () => useKibana<ContextEngineServices>();

export { useTypedKibana as useKibana };
