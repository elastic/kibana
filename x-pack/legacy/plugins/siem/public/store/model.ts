/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { appModel } from './app';
export { dragAndDropModel } from './drag_and_drop';
export { hostsModel } from './hosts';
export { inputsModel } from './inputs';
export { networkModel } from './network';

export type KueryFilterQueryKind = 'kuery' | 'lucene';

export interface KueryFilterQuery {
  kind: KueryFilterQueryKind;
  expression: string;
}

export interface SerializedFilterQuery {
  kuery: KueryFilterQuery | null;
  serializedQuery: string;
}
