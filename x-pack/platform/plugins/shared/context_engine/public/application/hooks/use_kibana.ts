/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ChatOpener, ContextEngineStartDependencies } from '../../types';

export interface ContextEngineServices extends CoreStart {
  share: ContextEngineStartDependencies['share'];
  data: ContextEngineStartDependencies['data'];
  console?: ContextEngineStartDependencies['console'];
  /** Resolves the Agent Builder chat opener registered by a downstream plugin, if any. */
  getChatOpener?: () => ChatOpener | undefined;
}

const useTypedKibana = () => useKibana<ContextEngineServices>();

export { useTypedKibana as useKibana };
