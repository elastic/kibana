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
  data: ContextEngineStartDependencies['data'];
  share: ContextEngineStartDependencies['share'];
  triggersActionsUi: ContextEngineStartDependencies['triggersActionsUi'];
  console?: ContextEngineStartDependencies['console'];
  spaces?: ContextEngineStartDependencies['spaces'];
  /**
   * Resolves the registered "Analyze & improve" chat opener at call time (or `undefined` if none is
   * registered yet). A getter — not the resolved value — so the button reacts to an opener that
   * #15593 registers after this app has mounted.
   */
  getChatOpener?: () => ChatOpener | undefined;
}

const useTypedKibana = () => useKibana<ContextEngineServices>();

export { useTypedKibana as useKibana };
