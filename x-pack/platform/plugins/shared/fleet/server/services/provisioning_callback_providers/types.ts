/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';

import type { CloudProvider } from '../../../common/types/models/cloud_connector';
import type { CloudConnectorCallbackIdentity } from '../../../common/types/models/provisioning_callback';
import type { CreateCloudConnectorRequest } from '../../../common/types/rest_spec/cloud_connector';
import type { ProvisioningCallbackSOAttributes } from '../../types/so_attributes';

/**
 * Whether a report was proven to come from the account (or tenant, or project) of what it
 * reports. `principal` is the cloud's name for the signer: an STS ARN, a managed identity, a
 * service account.
 */
export type OriginVerification<Rejection extends string = string> =
  | { verified: true; account: string; principal: string }
  | { verified: false; reason: Rejection; detail?: string };

export interface OriginExpectation<Report> {
  /** The record the report was received for. */
  callbackId: string;
  /** The values as received, before any of them is trusted. */
  report: Report;
}

export interface OriginVerifierOptions {
  /** Where the proof is checked instead of the cloud's own endpoint. For tests only. */
  verifierUrl?: string;
}

/**
 * What one cloud provider contributes to a provisioning callback. The record, its token, its
 * expiry and its state machine are shared; a provider says what a launched deployment reports,
 * how the report proves where it came from, what of it the record keeps, and what it creates.
 */
export interface ProvisioningCallbackProvider<Report, Proof> {
  readonly provider: CloudProvider;
  /** The body a deployment of this provider reports: its values plus `origin_proof`. */
  readonly reportSchema: ObjectType;
  /** Offline consistency checks on the received values. A message means the report is a 400. */
  validateReport(report: Report): string | undefined;
  /** Proves which account the report was sent from, bound to this record and these values. */
  verifyOrigin(
    proof: Proof,
    expectation: OriginExpectation<Report>,
    options: OriginVerifierOptions
  ): Promise<OriginVerification>;
  /** The reported values as the record stores them while and after the report is applied. */
  storedFields(report: Report): Partial<ProvisioningCallbackSOAttributes>;
  /** The reported values back from a record, or undefined when it holds none. */
  storedReport(attributes: ProvisioningCallbackSOAttributes): Report | undefined;
  /** The cloud connector the report creates, in the space of the record. */
  toConnector(
    report: Report,
    identity: CloudConnectorCallbackIdentity
  ): Omit<CreateCloudConnectorRequest, 'namespace'>;
}
