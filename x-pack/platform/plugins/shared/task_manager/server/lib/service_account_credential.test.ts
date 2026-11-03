/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskRunAs } from '../task';
import {
  getServiceAccountCredentialAttributes,
  credentialMatchesRunAs,
} from './service_account_credential';

const runAs: TaskRunAs = {
  workloadType: 'workflow',
  workloadId: 'workflow-1',
  spaceId: 'default',
  expectedServiceAccountId: 'service-account-1',
};

const serviceAccountCredential = { type: 'service_account', ...runAs };

describe('getServiceAccountCredentialAttributes', () => {
  it('returns a service account credential and a random 32 byte encrypted credential', () => {
    const attributes = getServiceAccountCredentialAttributes(runAs);

    expect(attributes).toEqual({
      credential: serviceAccountCredential,
      encryptedCredential: expect.any(String),
    });
    expect(Buffer.from(attributes.encryptedCredential, 'base64')).toHaveLength(32);
    expect(getServiceAccountCredentialAttributes(runAs).encryptedCredential).not.toEqual(
      attributes.encryptedCredential
    );
  });

  it('accepts a null expectedServiceAccountId', () => {
    expect(
      getServiceAccountCredentialAttributes({ ...runAs, expectedServiceAccountId: null }).credential
    ).toEqual({ ...serviceAccountCredential, expectedServiceAccountId: null });
  });

  it('does not store fields other than the runAs fields', () => {
    const binding = { ...runAs, serviceAccountId: 'service-account-1', createdAt: 'now' };

    expect(getServiceAccountCredentialAttributes(binding).credential).toEqual(
      serviceAccountCredential
    );
  });

  it.each([
    [
      'a missing expectedServiceAccountId',
      { expectedServiceAccountId: undefined },
      '[runAs.expectedServiceAccountId]',
    ],
    [
      'an empty expectedServiceAccountId',
      { expectedServiceAccountId: '' },
      '[runAs.expectedServiceAccountId]',
    ],
    ['an invalid workloadType', { workloadType: 'Workflow-Type' }, '[runAs.workloadType]'],
    ['an empty workloadId', { workloadId: '' }, '[runAs.workloadId]'],
    ['a workloadId over 512 characters', { workloadId: 'a'.repeat(513) }, '[runAs.workloadId]'],
    ['an empty spaceId', { spaceId: '' }, '[runAs.spaceId]'],
    ['a spaceId over 1024 characters', { spaceId: 'a'.repeat(1025) }, '[runAs.spaceId]'],
  ])('throws for %s', (_, override, expectedError) => {
    expect(() =>
      getServiceAccountCredentialAttributes({ ...runAs, ...override } as TaskRunAs)
    ).toThrow(expectedError);
  });
});

describe('credentialMatchesRunAs', () => {
  it('matches when neither has a service account', () => {
    expect(credentialMatchesRunAs(undefined, undefined)).toBe(true);
    expect(credentialMatchesRunAs({ type: 'other' }, undefined)).toBe(true);
  });

  it('matches a service account credential with the same runAs', () => {
    expect(credentialMatchesRunAs(serviceAccountCredential, runAs)).toBe(true);
  });

  it('treats a stored credential without expectedServiceAccountId as not pinned', () => {
    const { expectedServiceAccountId, ...unpinnedCredential } = serviceAccountCredential;

    expect(
      credentialMatchesRunAs(unpinnedCredential, { ...runAs, expectedServiceAccountId: null })
    ).toBe(true);
  });

  it('does not match when only one of them has a service account', () => {
    expect(credentialMatchesRunAs(undefined, runAs)).toBe(false);
    expect(credentialMatchesRunAs({ type: 'other' }, runAs)).toBe(false);
    expect(credentialMatchesRunAs(serviceAccountCredential, undefined)).toBe(false);
  });

  it.each([
    ['workloadType', { workloadType: 'other' }],
    ['workloadId', { workloadId: 'workflow-2' }],
    ['spaceId', { spaceId: 'other-space' }],
    ['expectedServiceAccountId', { expectedServiceAccountId: null }],
  ])('does not match a different %s', (_, override) => {
    expect(credentialMatchesRunAs(serviceAccountCredential, { ...runAs, ...override })).toBe(false);
  });
});
