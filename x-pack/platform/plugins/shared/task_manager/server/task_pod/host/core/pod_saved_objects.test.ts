/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { loggerMock } from '@kbn/logging-mocks';
import { PodSavedObjects } from './pod_saved_objects';
import { PodSpacesExtension } from './pod_spaces_extension';

const visibleType = {
  name: 'pod_visible',
  hidden: false,
  namespaceType: 'multiple-isolated' as const,
  mappings: { properties: { title: { type: 'text' as const } } },
};
const hiddenType = {
  name: 'pod_hidden',
  hidden: true,
  hiddenFromHttpApis: true,
  namespaceType: 'single' as const,
  indexPattern: '.pod_other_index',
  mappings: { properties: {} },
};

describe('PodSpacesExtension', () => {
  it('resolves the namespace of the active space, unless one is given', () => {
    expect(new PodSpacesExtension('default').getCurrentNamespace(undefined)).toBeUndefined();
    expect(new PodSpacesExtension('foo').getCurrentNamespace(undefined)).toBe('foo');
    expect(new PodSpacesExtension('foo').getCurrentNamespace('bar')).toBe('bar');
  });

  it('searches the active space unless namespaces are given', async () => {
    const extension = new PodSpacesExtension('foo');
    await expect(extension.getSearchableNamespaces(undefined)).resolves.toEqual(['foo']);
    await expect(extension.getSearchableNamespaces(['a', 'b'])).resolves.toEqual(['a', 'b']);
    expect(extension.asScopedToNamespace('baz').getCurrentNamespace(undefined)).toBe('baz');
  });
});

describe('PodSavedObjects', () => {
  // A pod never calls Elasticsearch while setting saved objects up: a client that fails on any use.
  const client = new Proxy(
    {},
    { get: () => () => Promise.reject(new Error('no ES in this test')) }
  );
  const startedWith = async (
    configure: (savedObjects: PodSavedObjects) => void = (so) => {
      so.setup.registerType(visibleType);
      so.setup.registerType(hiddenType);
    }
  ) => {
    const savedObjects = new PodSavedObjects();
    configure(savedObjects);
    await savedObjects.load();
    return savedObjects.start(client as never, loggerMock.create());
  };

  it('has the saved object types registered during setup, in their indices', async () => {
    const started = await startedWith();
    expect(started.getTypeRegistry().getType('pod_visible')).toBeDefined();
    expect(started.getDefaultIndex()).toBe('.kibana');
    expect(started.getIndexForType('pod_hidden')).toBe('.pod_other_index');
    expect(started.getAllIndices().sort()).toEqual(['.kibana', '.pod_other_index']);
    expect(started.getIndicesForTypes(['pod_visible', 'pod_hidden']).sort()).toEqual([
      '.kibana',
      '.pod_other_index',
    ]);
  });

  it('rejects types registered after load', async () => {
    const savedObjects = new PodSavedObjects();
    savedObjects.setup.registerType(visibleType);
    await savedObjects.load();
    expect(() => savedObjects.setup.registerType(hiddenType)).toThrow(/registered after setup/);
  });

  it('scopes a request-scoped client to the space of the fake request', async () => {
    const started = await startedWith();
    const inFoo = started.getScopedClient({
      headers: {},
      spaceId: 'foo',
    } as unknown as KibanaRequest);
    const inDefault = started.getScopedClient({ headers: {} } as unknown as KibanaRequest);
    expect(inFoo.getCurrentNamespace()).toBe('foo');
    expect(inDefault.getCurrentNamespace()).toBeUndefined();
    expect(inFoo.asScopedToNamespace('bar').getCurrentNamespace()).toBe('bar');
    expect(started.getUnsafeInternalClient().getCurrentNamespace()).toBeUndefined();
  });

  it('applies the encryption extension to scoped and internal clients, as Core does', async () => {
    const encryptionExtension = { isEncryptableType: () => false };
    const factory = jest.fn().mockReturnValue(encryptionExtension);
    const started = await startedWith((so) => {
      so.setup.registerType(visibleType);
      so.setup.setEncryptionExtension(factory);
    });
    const request = { headers: {}, spaceId: 'foo' } as unknown as KibanaRequest;
    started.getScopedClient(request);
    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ request }));
    started.getUnsafeInternalClient();
    expect(factory).toHaveBeenCalledTimes(2);
    started.getUnsafeInternalClient({ excludedExtensions: ['encryptedSavedObjects'] });
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('ignores hidden types of plugins outside the pod, and serves a hidden-only pod', async () => {
    const started = await startedWith((so) => so.setup.registerType(hiddenType));
    expect(() => started.createInternalRepository(['not_in_this_pod', 'pod_hidden'])).not.toThrow();
    expect(() => started.createInternalRepository()).not.toThrow();
  });

  it('creates a serializer over the type registry', async () => {
    const started = await startedWith();
    expect(started.createSerializer().isRawSavedObject).toBeDefined();
  });
});
