/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `not_loaded`: this node has not loaded the version (yet). A retry can succeed.
 * `cannot_build`: this node tried to build the version and failed. A retry cannot succeed.
 */
export type SpecVersionUnavailableReason = 'not_loaded' | 'cannot_build';

export class SpecVersionUnavailableError extends Error {
  public readonly reason: SpecVersionUnavailableReason;
  public readonly actionTypeId: string;
  public readonly specVersion: string;

  constructor({
    reason,
    actionTypeId,
    specVersion,
  }: {
    reason: SpecVersionUnavailableReason;
    actionTypeId: string;
    specVersion: string;
  }) {
    super(
      reason === 'cannot_build'
        ? `Spec version "${specVersion}" of connector type "${actionTypeId}" could not be built on this node.`
        : `Spec version "${specVersion}" of connector type "${actionTypeId}" is not loaded on this node.`
    );
    this.name = 'SpecVersionUnavailableError';
    this.reason = reason;
    this.actionTypeId = actionTypeId;
    this.specVersion = specVersion;
  }
}
