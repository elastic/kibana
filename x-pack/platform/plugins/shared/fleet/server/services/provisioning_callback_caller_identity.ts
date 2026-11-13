/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import { fetch as undiciFetch } from 'undici';
import { timeoutSignal } from '@kbn/std';

import type {
  CloudConnectorCallbackReceivedValues,
  CloudConnectorCallerIdentityProof,
} from '../../common/types/models/provisioning_callback';

/**
 * Verifies where a provisioning callback report came from. The reporting Lambda signs an STS
 * `GetCallerIdentity` request with its execution-role credentials and sends the signed headers
 * with the report; Kibana forwards them to STS, which answers with the account and principal the
 * credentials belong to. No AWS credentials are needed in Kibana. The same pattern as Vault's AWS
 * IAM auth and `aws-iam-authenticator`.
 *
 * The signature covers two headers Kibana puts a meaning on: the callback id and the SHA-256 of
 * the reported values. A proof captured from one report therefore verifies for no other record
 * and no other values.
 */

/** The only body Kibana sends to STS; the proof must have been signed over it. */
export const STS_GET_CALLER_IDENTITY_BODY = 'Action=GetCallerIdentity&Version=2011-06-15';
/** Signed header carrying the id of the record the report is for. */
export const CALLER_IDENTITY_CALLBACK_ID_HEADER = 'x-elastic-callback-id';
/** Signed header carrying the SHA-256 of the canonical reported values. */
export const CALLER_IDENTITY_REPORT_DIGEST_HEADER = 'x-elastic-report-sha256';
/**
 * A commercial or GovCloud region, which is all `sts.<region>.amazonaws.com` serves. Strict on
 * purpose: the region becomes part of the host Kibana connects to.
 */
export const AWS_REGION_PATTERN = /^[a-z]{2}(-gov)?-[a-z]+-\d$/;

/** Logical ids in the `aws/workload_identity_federation` blueprint's callback patch. */
const CALLBACK_FUNCTION_LOGICAL_ID = 'ElasticCallbackFunction';
const CALLBACK_FUNCTION_ROLE_LOGICAL_ID = 'ElasticCallbackFunctionRole';

/** Headers forwarded to STS. Anything else the caller sent is dropped before the request. */
const FORWARDED_HEADERS = [
  'authorization',
  'content-type',
  'x-amz-date',
  'x-amz-security-token',
  CALLER_IDENTITY_CALLBACK_ID_HEADER,
  CALLER_IDENTITY_REPORT_DIGEST_HEADER,
];
const STS_TIMEOUT_MS = 5_000;
/** A GetCallerIdentity response is a few hundred bytes; anything past this is not one. */
const MAX_STS_RESPONSE_BYTES = 16 * 1024;

const SIGV4_AUTHORIZATION_PATTERN =
  /^AWS4-HMAC-SHA256 Credential=([^,\s]+), SignedHeaders=([^,\s]+), Signature=[0-9a-f]{64}$/;
const ASSUMED_ROLE_ARN_PATTERN = /^arn:aws(?:-[a-z]+)*:sts::(\d{12}):assumed-role\/([^/]+)\/(.+)$/;
const STACK_NAME_PATTERN = /:stack\/([^/]+)\//;

export type CallerIdentityRejection =
  /** The region is not one Kibana builds an STS host from. */
  | 'invalid_region'
  /** The `Authorization` header is not a SigV4 header for STS in that region. */
  | 'malformed_authorization'
  /** The binding headers are missing, or not in the signed set, so STS would not check them. */
  | 'unsigned_binding'
  /** The binding headers name another record or other values than the ones received. */
  | 'proof_not_bound'
  /** STS did not answer in time, or the connection failed. */
  | 'sts_unreachable'
  /** STS refused the signature, or answered with something that is not a caller identity. */
  | 'sts_rejected'
  /** The signer is not in the account of the reported role and stack. */
  | 'account_mismatch'
  /** The signer is in the right account but is not the stack's callback function. */
  | 'not_callback_function';

export type CallerIdentityVerification =
  | { verified: true; account: string; arn: string }
  | { verified: false; reason: CallerIdentityRejection; detail?: string };

export interface CallerIdentityExpectation {
  /** The record the report was received for. */
  callbackId: string;
  /** The values as received, before any of them is trusted. */
  report: CloudConnectorCallbackReceivedValues;
}

export interface CallerIdentityVerifierOptions {
  /** Where the signed request goes instead of the regional STS endpoint. For tests only. */
  stsUrl?: string;
  fetch?: typeof undiciFetch;
}

/**
 * The reported values as the Lambda hashes them: sorted keys, no whitespace, non-ASCII escaped
 * as Python's `json.dumps` does by default.
 */
export const canonicalReportDigest = (report: CloudConnectorCallbackReceivedValues): string => {
  const canonical = JSON.stringify({
    role_arn: report.role_arn,
    stack_arn: report.stack_arn,
  }).replace(/[\u0080-￿]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return createHash('sha256').update(canonical).digest('hex');
};

/**
 * Whether `name` is what CloudFormation generates for `logicalId` in stack `stackName`:
 * `<stack name>-<logical id>-<random>`, where either part is cut short when the whole would be
 * too long for the resource's name limit.
 */
export const isGeneratedResourceName = (
  name: string,
  stackName: string,
  logicalId: string
): boolean => {
  const suffix = name.lastIndexOf('-');
  if (suffix <= 0 || !/^[A-Za-z0-9]+$/.test(name.slice(suffix + 1))) {
    return false;
  }
  const stem = name.slice(0, suffix);
  for (let i = 1; i < stem.length - 1; i++) {
    if (stem[i] !== '-') {
      continue;
    }
    const stackPart = stem.slice(0, i);
    const logicalPart = stem.slice(i + 1);
    if (stackName.startsWith(stackPart) && logicalId.startsWith(logicalPart)) {
      return true;
    }
  }
  return false;
};

const accountIdOfArn = (arn: string): string | undefined => arn.split(':')[4];

const lowerCaseHeaders = (headers: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));

/** The `Account` and `Arn` of a GetCallerIdentity response, or undefined when it is not one. */
const parseCallerIdentity = (xml: string): { account: string; arn: string } | undefined => {
  const account = /<Account>(\d{12})<\/Account>/.exec(xml)?.[1];
  const arn = /<Arn>([^<]{1,2048})<\/Arn>/.exec(xml)?.[1];
  return account && arn ? { account, arn } : undefined;
};

const reject = (
  reason: CallerIdentityRejection,
  detail?: string
): { verified: false; reason: CallerIdentityRejection; detail?: string } => ({
  verified: false,
  reason,
  ...(detail ? { detail } : {}),
});

/**
 * Forwards the signed request to STS and judges the answer against the report: the signer must
 * be in the account of the reported role and stack, and must be the callback function of that
 * stack. The checks that need no network come first, so a proof made for another record never
 * reaches STS.
 */
export const verifyCallerIdentity = async (
  proof: CloudConnectorCallerIdentityProof,
  { callbackId, report }: CallerIdentityExpectation,
  { stsUrl, fetch = undiciFetch }: CallerIdentityVerifierOptions = {}
): Promise<CallerIdentityVerification> => {
  if (!AWS_REGION_PATTERN.test(proof.region)) {
    return reject('invalid_region');
  }
  if (proof.body !== STS_GET_CALLER_IDENTITY_BODY) {
    return reject('malformed_authorization', 'body is not GetCallerIdentity');
  }
  const headers = lowerCaseHeaders(proof.headers);
  const authorization = SIGV4_AUTHORIZATION_PATTERN.exec(headers.authorization ?? '');
  if (!authorization) {
    return reject('malformed_authorization');
  }
  const [, credential, signedHeaders] = authorization;
  const scope = credential.split('/');
  if (scope.length !== 5 || scope[2] !== proof.region || scope[3] !== 'sts') {
    return reject('malformed_authorization', 'credential scope is not STS in the region');
  }
  const signed = signedHeaders.split(';');
  if (
    !signed.includes('host') ||
    !signed.includes(CALLER_IDENTITY_CALLBACK_ID_HEADER) ||
    !signed.includes(CALLER_IDENTITY_REPORT_DIGEST_HEADER)
  ) {
    return reject('unsigned_binding');
  }
  if (headers[CALLER_IDENTITY_CALLBACK_ID_HEADER] !== callbackId) {
    return reject('proof_not_bound', 'callback id');
  }
  if (headers[CALLER_IDENTITY_REPORT_DIGEST_HEADER] !== canonicalReportDigest(report)) {
    return reject('proof_not_bound', 'report digest');
  }

  const forwarded = Object.fromEntries(
    FORWARDED_HEADERS.filter((name) => headers[name] !== undefined).map((name) => [
      name,
      headers[name],
    ])
  );
  let body: string;
  let status: number;
  // The deadline covers reading the body too, not only the response headers.
  const signal = timeoutSignal(STS_TIMEOUT_MS);
  try {
    const response = await fetch(stsUrl ?? `https://sts.${proof.region}.amazonaws.com/`, {
      method: 'POST',
      headers: forwarded,
      body: STS_GET_CALLER_IDENTITY_BODY,
      redirect: 'manual',
      signal,
    });
    status = response.status;
    const bytes = await response.arrayBuffer();
    body = Buffer.from(bytes.slice(0, MAX_STS_RESPONSE_BYTES)).toString('utf8');
  } catch (error) {
    return reject('sts_unreachable', error instanceof Error ? error.name : undefined);
  } finally {
    signal.dispose();
  }
  if (status !== 200) {
    return reject('sts_rejected', `http ${status}`);
  }
  const identity = parseCallerIdentity(body);
  if (!identity) {
    return reject('sts_rejected', 'no caller identity in the response');
  }

  const { account, arn } = identity;
  if (account !== accountIdOfArn(report.role_arn) || account !== accountIdOfArn(report.stack_arn)) {
    return reject('account_mismatch');
  }
  const principal = ASSUMED_ROLE_ARN_PATTERN.exec(arn);
  const stackName = STACK_NAME_PATTERN.exec(report.stack_arn)?.[1];
  if (
    !principal ||
    principal[1] !== account ||
    !stackName ||
    !isGeneratedResourceName(principal[2], stackName, CALLBACK_FUNCTION_ROLE_LOGICAL_ID) ||
    !isGeneratedResourceName(principal[3], stackName, CALLBACK_FUNCTION_LOGICAL_ID)
  ) {
    return reject('not_callback_function');
  }
  return { verified: true, account, arn };
};
