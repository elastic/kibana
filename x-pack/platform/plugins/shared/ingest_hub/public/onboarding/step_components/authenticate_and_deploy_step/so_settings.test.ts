/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceInstance } from '../service_settings_step/use_service_settings';
import { toSOMetadataUpdate, toSOSettings, toSOSettingsUpdate } from './so_settings';

const original: ServiceInstance = {
  instanceId: 'ec2',
  serviceId: 'ec2',
  name: 'Amazon EC2',
  isDuplicate: false,
};
const duplicate: ServiceInstance = {
  instanceId: 'ec2__dup-1',
  serviceId: 'ec2',
  name: 'EC2 prod',
  isDuplicate: true,
};

describe('toSOSettings', () => {
  it('returns the trimmed name and description', () => {
    expect(toSOSettings({ integrationName: ' my-aws ', description: ' Production ' })).toEqual({
      integrationName: 'my-aws',
      description: 'Production',
    });
  });

  it('returns the trimmed namespace', () => {
    expect(toSOSettings({ namespace: ' prod ' })).toEqual({ namespace: 'prod' });
  });

  it('leaves out fields that are missing or blank', () => {
    expect(toSOSettings({ integrationName: '  ', description: '', namespace: ' ' })).toEqual({});
    expect(toSOSettings(undefined)).toEqual({});
    expect(toSOSettings(null)).toEqual({});
  });

  it('returns the instances, duplicates included', () => {
    expect(toSOSettings({ instances: [original, duplicate] })).toEqual({
      instances: [original, duplicate],
    });
  });

  it('keeps only the stored fields of an instance', () => {
    const withExtras = { ...duplicate, somethingElse: 'x' } as ServiceInstance;

    expect(toSOSettings({ instances: [withExtras] })).toEqual({ instances: [duplicate] });
  });

  it('leaves out the instances when there are none, so a stored list is never cleared by an empty one', () => {
    expect(toSOSettings({ instances: [] })).toEqual({});
    expect(toSOSettings({ integrationName: 'my-aws' })).toEqual({ integrationName: 'my-aws' });
  });
});

describe('toSOSettingsUpdate', () => {
  it('returns the trimmed name and description', () => {
    expect(
      toSOSettingsUpdate({ integrationName: ' my-aws ', description: ' Production ' })
    ).toEqual({
      integrationName: 'my-aws',
      description: 'Production',
      namespace: null,
    });
  });

  it('sends the trimmed namespace', () => {
    expect(toSOSettingsUpdate({ namespace: ' prod ' })).toEqual({
      description: null,
      namespace: 'prod',
    });
  });

  it('sends null for a blank description or namespace so a cleared one is removed from the record', () => {
    expect(
      toSOSettingsUpdate({ integrationName: 'my-aws', description: '  ', namespace: '' })
    ).toEqual({
      integrationName: 'my-aws',
      description: null,
      namespace: null,
    });
    expect(toSOSettingsUpdate({ integrationName: 'my-aws' })).toEqual({
      integrationName: 'my-aws',
      description: null,
      namespace: null,
    });
  });

  it('never sends a blank name', () => {
    expect(toSOSettingsUpdate({ integrationName: ' ', description: 'x' })).toEqual({
      description: 'x',
      namespace: null,
    });
  });

  it('sends the instances along with the other settings', () => {
    expect(
      toSOSettingsUpdate({ integrationName: 'my-aws', instances: [original, duplicate] })
    ).toEqual({
      integrationName: 'my-aws',
      description: null,
      namespace: null,
      instances: [original, duplicate],
    });
  });

  it('leaves out the instances when there are none', () => {
    expect(toSOSettingsUpdate({ integrationName: 'my-aws', instances: [] })).toEqual({
      integrationName: 'my-aws',
      description: null,
      namespace: null,
    });
  });
});

describe('toSOMetadataUpdate', () => {
  it('returns the name and description without the namespace', () => {
    expect(
      toSOMetadataUpdate({ integrationName: ' my-aws ', description: ' x ', namespace: 'prod' })
    ).toEqual({ integrationName: 'my-aws', description: 'x' });
  });

  it('still sends null for a cleared description', () => {
    expect(toSOMetadataUpdate({ integrationName: 'my-aws', namespace: 'prod' })).toEqual({
      integrationName: 'my-aws',
      description: null,
    });
  });

  it('sends the name and description without the instances, which are saved only with a deploy', () => {
    expect(
      toSOMetadataUpdate({
        integrationName: ' my-aws ',
        description: 'Production',
        instances: [original, duplicate],
      })
    ).toEqual({ integrationName: 'my-aws', description: 'Production' });
  });
});
