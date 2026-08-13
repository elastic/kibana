/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { CoreStart } from '@kbn/core/public';

export interface CanvasStateServiceDeps {
  core: CoreStart;
  urlStateStorageContainer: IKbnUrlStateStorage;
}

export interface CanvasUrlInput {
  flyoutName: string | null;
  flyoutTab: string | null;
}

export interface CanvasState {
  urlState: CanvasUrlInput;
}

export type CanvasUrlEvent =
  | { type: 'url.init'; urlState: CanvasUrlInput }
  | { type: 'url.sync' }
  | { type: 'flyout.open'; flyoutName: string }
  | { type: 'flyout.tab'; flyoutTab: string }
  | { type: 'flyout.close' };
