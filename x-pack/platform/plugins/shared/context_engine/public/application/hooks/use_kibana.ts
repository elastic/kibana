/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ContextEngineAppServices } from '../../types';

export interface ContextEngineServices extends ContextEngineAppServices {
  agentBuilder?: AgentBuilderPluginStart;
  share: SharePluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  console?: ConsolePluginStart;
}

const useTypedKibana = () => useKibana<ContextEngineServices>();

export { useTypedKibana as useKibana };
