/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  getWorkloadBindingId,
  registerWorkloadBindingSavedObjectType,
  SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
} from './binding_saved_object';
export type { WorkloadBindingAttributes, WorkloadBindingCoordinates } from './binding_saved_object';
export { resolveWorkloadAttacher } from './resolve_workload_attacher';
export { WorkloadBindingStore } from './workload_binding_store';
export type { WorkloadBindingStoreOptions } from './workload_binding_store';
export {
  createNotImplementedWorkloadBindings,
  ServiceAccountWorkloadBindings,
} from './workload_bindings';
export type {
  ServiceAccountWorkloadBindingsApi,
  ServiceAccountWorkloadBindingsOptions,
} from './workload_bindings';
