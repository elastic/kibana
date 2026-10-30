/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';

import { createServerlessExportGate, withAvailabilityGate } from './serverless_export_gate';

const prerequisiteCheckArgs = {
  capabilities: coreMock.createStart().application.capabilities,
  objectType: 'dashboard',
};

describe('createServerlessExportGate', () => {
  it('is available on traditional without subscribing to the feature flag', () => {
    const flag$ = new BehaviorSubject(false);
    const subscribe = jest.spyOn(flag$, 'subscribe');

    const isAvailable = createServerlessExportGate({
      isServerless: false,
      enabled$: flag$,
    });

    expect(isAvailable()).toBe(true);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('is available on serverless when the feature flag is on', () => {
    const isAvailable = createServerlessExportGate({
      isServerless: true,
      enabled$: new BehaviorSubject(true),
    });

    expect(isAvailable()).toBe(true);
  });

  it('is unavailable on serverless when the feature flag is off', () => {
    const isAvailable = createServerlessExportGate({
      isServerless: true,
      enabled$: new BehaviorSubject(false),
    });

    expect(isAvailable()).toBe(false);
  });

  it('is unavailable on serverless until the flag has emitted', () => {
    const isAvailable = createServerlessExportGate({
      isServerless: true,
      enabled$: new Subject<boolean>(),
    });

    expect(isAvailable()).toBe(false);
  });

  it('follows the flag as it changes, rather than caching the first value', () => {
    const flag$ = new BehaviorSubject(false);

    const isAvailable = createServerlessExportGate({
      isServerless: true,
      enabled$: flag$,
    });

    expect(isAvailable()).toBe(false);

    flag$.next(true);
    expect(isAvailable()).toBe(true);

    flag$.next(false);
    expect(isAvailable()).toBe(false);
  });
});

describe('withAvailabilityGate', () => {
  it('hides the integration when it is unavailable, without running its own check', () => {
    const prerequisiteCheck = jest.fn().mockReturnValue(true);

    const gated = withAvailabilityGate({ id: 'pdfReports', prerequisiteCheck }, () => false);

    expect(gated.prerequisiteCheck?.(prerequisiteCheckArgs)).toBe(false);
    expect(prerequisiteCheck).not.toHaveBeenCalled();
  });

  it('defers to the integration when it is available', () => {
    const prerequisiteCheck = jest.fn().mockReturnValue(false);

    const gated = withAvailabilityGate({ id: 'pdfReports', prerequisiteCheck }, () => true);

    expect(gated.prerequisiteCheck?.(prerequisiteCheckArgs)).toBe(false);
    expect(prerequisiteCheck).toHaveBeenCalledWith(prerequisiteCheckArgs);
  });

  it('treats an integration with no check of its own as available', () => {
    const gated = withAvailabilityGate({ id: 'pdfReports' }, () => true);

    expect(gated.prerequisiteCheck?.(prerequisiteCheckArgs)).toBe(true);
  });

  it('leaves the rest of the integration untouched', () => {
    const integration = { id: 'pdfReports', groupId: 'export' };

    const gated = withAvailabilityGate(integration, () => true);

    expect(gated).toMatchObject({ id: 'pdfReports', groupId: 'export' });
    expect(integration).not.toHaveProperty('prerequisiteCheck');
  });
});
