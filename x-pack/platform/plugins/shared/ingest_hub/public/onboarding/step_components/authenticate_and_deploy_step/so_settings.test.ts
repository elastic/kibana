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

  it('leaves out fields that are missing or blank', () => {
    expect(toSOSettings({ integrationName: '  ', description: '' })).toEqual({});
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
    });
  });

  it('sends null for a blank description so a cleared one is removed from the record', () => {
    expect(toSOSettingsUpdate({ integrationName: 'my-aws', description: '  ' })).toEqual({
      integrationName: 'my-aws',
      description: null,
    });
    expect(toSOSettingsUpdate({ integrationName: 'my-aws' })).toEqual({
      integrationName: 'my-aws',
      description: null,
    });
  });

  it('never sends a blank name', () => {
    expect(toSOSettingsUpdate({ integrationName: ' ', description: 'x' })).toEqual({
      description: 'x',
    });
  });

  it('sends the instances along with the name and description', () => {
    expect(
      toSOSettingsUpdate({ integrationName: 'my-aws', instances: [original, duplicate] })
    ).toEqual({
      integrationName: 'my-aws',
      description: null,
      instances: [original, duplicate],
    });
  });

  it('leaves out the instances when there are none', () => {
    expect(toSOSettingsUpdate({ integrationName: 'my-aws', instances: [] })).toEqual({
      integrationName: 'my-aws',
      description: null,
    });
  });
});

describe('toSOMetadataUpdate', () => {
  it('sends the name and description without the instances, which are saved only with a deploy', () => {
    expect(
      toSOMetadataUpdate({
        integrationName: ' my-aws ',
        description: 'Production',
        instances: [original, duplicate],
      })
    ).toEqual({ integrationName: 'my-aws', description: 'Production' });
  });

  it('still sends null for a blank description', () => {
    expect(toSOMetadataUpdate({ integrationName: 'my-aws', instances: [original] })).toEqual({
      integrationName: 'my-aws',
      description: null,
    });
  });
});
