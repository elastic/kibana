/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class PipelineNotFoundError extends Error {
  constructor(pipelineId: string, versionHash: string, clusterUuid: string) {
    super(
      `Pipeline documents for [${pipelineId} @ ${versionHash}] not found in the selected time range for cluster [${clusterUuid}].`
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
