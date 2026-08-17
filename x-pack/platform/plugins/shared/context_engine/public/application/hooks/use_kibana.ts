/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AgentBuilderIntegration, ContextEngineStartDependencies } from '../../types';

export interface ContextEngineServices extends CoreStart {
  data: ContextEngineStartDependencies['data'];
  share: ContextEngineStartDependencies['share'];
  triggersActionsUi: ContextEngineStartDependencies['triggersActionsUi'];
  console?: ContextEngineStartDependencies['console'];
  spaces?: ContextEngineStartDependencies['spaces'];
  /**
   * Getter for registered Agent Builder integration hooks, resolved at call time (`undefined` when
   * none are registered). A getter rather than the resolved value so hooks registered after mount
   * are picked up on the next render.
   */
  getAgentBuilderIntegration?: () => AgentBuilderIntegration | undefined;
}

const useTypedKibana = () => useKibana<ContextEngineServices>();

export { useTypedKibana as useKibana };
