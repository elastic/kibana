/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import { fetch as undiciFetch } from 'undici';
import type { Response as UndiciResponse } from 'undici';
import { timeoutSignal } from '@kbn/std';

import type {
  CloudConnectorCallbackReceivedValues,
  CloudConnectorCallerIdentityProof,
} from '../../../../common/types/models/provisioning_callback';
import {
  AWS_REGION_PATTERN,
  STS_GET_CALLER_IDENTITY_BODY,
} from '../../../types/rest_spec/provisioning_callback_providers/aws';

/**
 * Verifies where a provisioning callback report came from. The reporting Lambda signs an STS
 * `GetCallerIdentity` request with its execution-role credentials and sends the signed headers
 * with the report; Kibana forwards them to STS, which answers with the account and principal the
 * credentials belong to. No AWS credentials are needed in Kibana. The same pattern as Vault's AWS
 * IAM auth and `aws-iam-authenticator`.
 *
 * What this proves is the account: the signer holds credentials of the account of the reported
 * role and stack. The signer's role and session must also be named as CloudFormation names the
 * stack's callback function and its role, which turns away a stray principal of the account but
 * proves nothing more, since whoever controls the account picks the names.
 *
 * The signature covers two headers Kibana puts a meaning on: the callback id and the SHA-256 of
 * the reported values. A proof captured from one report therefore verifies for no other record
 * and no other values.
 */

/** Signed header carrying the id of the record the report is for. */
export const CALLER_IDENTITY_CALLBACK_ID_HEADER = 'x-elastic-callback-id';
/** Signed header carrying the SHA-256 of the canonical reported values. */
export const CALLER_IDENTITY_REPORT_DIGEST_HEADER = 'x-elastic-report-sha256';

/** Logical ids in the `aws/workload_identity_federation` blueprint's callback patch. */
const CALLBACK_FUNCTION_LOGICAL_ID = 'ElasticCallbackFunction';
const CALLBACK_FUNCTION_ROLE_LOGICAL_ID = 'ElasticCallbackFunctionRole';

/**
 * Headers forwarded to STS: `Authorization` and what it names as signed, except `host`, which is
 * the endpoint Kibana connects to. Anything else the caller sent is dropped before the request.
 */
const UNSIGNED_FORWARDED_HEADERS = ['authorization'];
const STS_TIMEOUT_MS = 5_000;
/** A GetCallerIdentity response is a few hundred bytes; reading stops past this. */
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
  /** The signer is in the right account but is not named as the stack's callback function. */
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

/** The random part CloudFormation appends to a generated name. */
const GENERATED_SUFFIX_PATTERN = /^[A-Za-z0-9]{12,13}$/;
/** IAM role names and Lambda function names are both limited to 64 characters. */
const GENERATED_NAME_MAX_LENGTH = 64;

/**
 * Whether `name` is what CloudFormation generates for `logicalId` in stack `stackName`:
 * `<stack name>-<logical id>-<random alphanumerics>` (12 of mixed case today, 13 upper-case
 * ones in older stacks). When that is too long for the resource's name limit, the stack name,
 * the logical id or both are cut short; how far is not documented, so any cut that fits the
 * limit is taken. Otherwise both parts are whole. A heuristic, not the security boundary: it
 * turns away a stray principal of the account, nothing an attacker in the account could not
 * name around.
 */
export const isGeneratedResourceName = (
  name: string,
  stackName: string,
  logicalId: string
): boolean => {
  const suffix = name.lastIndexOf('-');
  if (suffix <= 0 || !GENERATED_SUFFIX_PATTERN.test(name.slice(suffix + 1))) {
    return false;
  }
  const stem = name.slice(0, suffix);
  const whole = `${stackName}-${logicalId}`;
  if (whole.length + (name.length - suffix) <= GENERATED_NAME_MAX_LENGTH) {
    return stem === whole;
  }
  if (name.length > GENERATED_NAME_MAX_LENGTH) {
    return false;
  }
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

const partitionOfArn = (arn: string): string | undefined => arn.split(':')[1];
const accountIdOfArn = (arn: string): string | undefined => arn.split(':')[4];
/** The partition whose STS serves `region`; GovCloud regions are the `aws-us-gov` partition. */
const partitionOfRegion = (region: string): string =>
  region.startsWith('us-gov-') ? 'aws-us-gov' : 'aws';

const lowerCaseHeaders = (headers: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));

/** The `Account` and `Arn` of a GetCallerIdentity response, or undefined when it is not one. */
const parseCallerIdentity = (xml: string): { account: string; arn: string } | undefined => {
  const account = /<Account>(\d{12})<\/Account>/.exec(xml)?.[1];
  const arn = /<Arn>([^<]{1,2048})<\/Arn>/.exec(xml)?.[1];
  return account && arn ? { account, arn } : undefined;
};

/** The body up to the limit, or undefined once it has gone past it, the rest left unread. */
const readBounded = async (
  body: UndiciResponse['body'],
  limit: number
): Promise<string | undefined> => {
  if (!body) {
    return '';
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return Buffer.concat(chunks).toString('utf8');
    }
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
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
 * be in the account of the reported role and stack, and must be named as the callback function
 * of that stack. The checks that need no network come first, so a proof made for another record
 * never reaches STS.
 */
export const verifyCallerIdentity = async (
  proof: CloudConnectorCallerIdentityProof,
  { callbackId, report }: CallerIdentityExpectation,
  { stsUrl, fetch = undiciFetch }: CallerIdentityVerifierOptions = {}
): Promise<CallerIdentityVerification> => {
  if (!AWS_REGION_PATTERN.test(proof.region)) {
    return reject('invalid_region');
  }
  const partition = partitionOfArn(report.role_arn);
  if (partitionOfRegion(proof.region) !== partition) {
    return reject('invalid_region', 'region is not in the partition of the reported role');
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

  const forwardedNames = [
    ...UNSIGNED_FORWARDED_HEADERS,
    ...signed.filter((name) => name !== 'host'),
  ];
  const notSent = forwardedNames.find((name) => headers[name] === undefined);
  if (notSent) {
    return reject('malformed_authorization', `signed header not sent: ${notSent}`);
  }
  const forwarded = Object.fromEntries(forwardedNames.map((name) => [name, headers[name]]));
  let body: string | undefined;
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
    body = await readBounded(response.body, MAX_STS_RESPONSE_BYTES);
  } catch (error) {
    return reject('sts_unreachable', error instanceof Error ? error.name : undefined);
  } finally {
    signal.dispose();
  }
  if (status !== 200) {
    return reject('sts_rejected', `http ${status}`);
  }
  if (body === undefined) {
    return reject('sts_rejected', `response larger than ${MAX_STS_RESPONSE_BYTES} bytes`);
  }
  const identity = parseCallerIdentity(body);
  if (!identity) {
    return reject('sts_rejected', 'no caller identity in the response');
  }

  const { account, arn } = identity;
  if (account !== accountIdOfArn(report.role_arn) || account !== accountIdOfArn(report.stack_arn)) {
    return reject('account_mismatch');
  }
  // The same account number exists in every partition; the signer has to be in this one.
  if (partitionOfArn(arn) !== partition || partitionOfArn(report.stack_arn) !== partition) {
    return reject('account_mismatch', 'partition');
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
