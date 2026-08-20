/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { matchesPattern, patternsOverlap } from './patterns';
export {
  claimBaseNameOf,
  getDatasetClaimNames,
  getNamespaceProspectiveTemplates,
  getPackageClaimNames,
  getPackageProspectiveTemplates,
  getProspectiveTemplatesFromExisting,
  getClaimNamesFromInstalledEs,
  mergeClaimNames,
  isDatasetSpecificPattern,
} from './claim_names';
export type { DatasetClaimNames, ProspectiveTemplate } from './claim_names';
export { resolveDatasetOwnership } from './resolve_ownership';
export { assertComponentTemplatesMutable } from './component_templates';
export type {
  AdoptedStream,
  OwnershipConflict,
  OwnershipConflictReason,
  OwnershipResolution,
} from './resolve_ownership';
export {
  acquireDatasetClaims,
  assertNoOverlappingForeignClaims,
  deleteClaims,
  finalizeDatasetClaims,
  findClaimsForPackage,
  getDatasetClaims,
  recordAdoptedStreamBaselines,
  releaseAttemptClaims,
  transferPendingClaims,
} from './claims';
export { withDatasetOwnershipLock } from './lock';
export { hasLiveReservation, isReservedToAttempt } from './reservation';
export type {
  AdoptedStreamBaseline,
  DatasetClaimAttributes,
  DatasetClaimOrigin,
  DatasetClaimRequest,
} from './claims';
export { DatasetClaimConflictError, DatasetOwnershipConflictError } from './errors';
export { enforceInstallDatasetOwnership } from './enforce_install_ownership';
