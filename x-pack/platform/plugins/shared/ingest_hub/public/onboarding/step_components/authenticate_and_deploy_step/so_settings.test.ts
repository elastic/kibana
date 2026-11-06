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

  it('returns the package policy settings that have a value', () => {
    expect(toSOSettings({ policySettings: { output_id: 'logstash-1' } })).toEqual({
      policySettings: { output_id: 'logstash-1' },
    });
    expect(toSOSettings({ policySettings: { output_id: '' } })).toEqual({});
  });

  it('leaves out the instances when there are none, so a stored list is never cleared by an empty one', () => {
    expect(toSOSettings({ instances: [] })).toEqual({});
    expect(toSOSettings({ integrationName: 'my-aws' })).toEqual({ integrationName: 'my-aws' });
  });
});

describe('dedicatedNamespaceTemplates', () => {
  it('is saved when it is on and there is a namespace', () => {
    expect(toSOSettings({ namespace: 'prod', dedicatedNamespaceTemplates: true })).toEqual({
      namespace: 'prod',
      dedicatedNamespaceTemplates: true,
    });
  });

  it('is left out when it is off', () => {
    expect(toSOSettings({ namespace: 'prod', dedicatedNamespaceTemplates: false })).toEqual({
      namespace: 'prod',
    });
  });

  it('is not saved without a namespace, so a stale value is dropped', () => {
    expect(toSOSettings({ namespace: ' ', dedicatedNamespaceTemplates: true })).toEqual({});
    expect(toSOSettings({ dedicatedNamespaceTemplates: true })).toEqual({});
  });

  it('is always sent on an update, so turning it off clears the stored value', () => {
    expect(
      toSOSettingsUpdate({ namespace: 'prod', dedicatedNamespaceTemplates: true })
    ).toMatchObject({ dedicatedNamespaceTemplates: true });
    expect(
      toSOSettingsUpdate({ namespace: 'prod', dedicatedNamespaceTemplates: false })
    ).toMatchObject({ dedicatedNamespaceTemplates: false });
    expect(toSOSettingsUpdate({ namespace: 'prod' })).toMatchObject({
      dedicatedNamespaceTemplates: false,
    });
  });

  it('is left out of the metadata update, so it stays paired with the namespace', () => {
    expect(
      toSOMetadataUpdate({
        integrationName: 'my-aws',
        namespace: 'prod',
        dedicatedNamespaceTemplates: true,
      })
    ).toEqual({ integrationName: 'my-aws', description: null });
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
      dedicatedNamespaceTemplates: false,
      policySettings: {},
    });
  });

  it('sends the trimmed namespace', () => {
    expect(toSOSettingsUpdate({ namespace: ' prod ' })).toEqual({
      description: null,
      namespace: 'prod',
      dedicatedNamespaceTemplates: false,
      policySettings: {},
    });
  });

  it('sends null for a blank description or namespace so a cleared one is removed from the record', () => {
    expect(
      toSOSettingsUpdate({ integrationName: 'my-aws', description: '  ', namespace: '' })
    ).toEqual({
      integrationName: 'my-aws',
      description: null,
      namespace: null,
      dedicatedNamespaceTemplates: false,
      policySettings: {},
    });
    expect(toSOSettingsUpdate({ integrationName: 'my-aws' })).toEqual({
      integrationName: 'my-aws',
      description: null,
      namespace: null,
      dedicatedNamespaceTemplates: false,
      policySettings: {},
    });
  });

  it('never sends a blank name', () => {
    expect(toSOSettingsUpdate({ integrationName: ' ', description: 'x' })).toEqual({
      description: 'x',
      namespace: null,
      dedicatedNamespaceTemplates: false,
      policySettings: {},
    });
  });

  it('sends the instances along with the other settings', () => {
    expect(
      toSOSettingsUpdate({ integrationName: 'my-aws', instances: [original, duplicate] })
    ).toEqual({
      integrationName: 'my-aws',
      description: null,
      namespace: null,
      dedicatedNamespaceTemplates: false,
      policySettings: {},
      instances: [original, duplicate],
    });
  });

  it('leaves out the instances when there are none', () => {
    expect(toSOSettingsUpdate({ integrationName: 'my-aws', instances: [] })).toEqual({
      integrationName: 'my-aws',
      description: null,
      namespace: null,
      dedicatedNamespaceTemplates: false,
      policySettings: {},
    });
  });

  it('sends the package policy settings, empty when none has a value so a cleared one is removed', () => {
    expect(toSOSettingsUpdate({ policySettings: { output_id: 'logstash-1' } })).toEqual(
      expect.objectContaining({ policySettings: { output_id: 'logstash-1' } })
    );
    expect(toSOSettingsUpdate({ policySettings: { output_id: '' } })).toEqual(
      expect.objectContaining({ policySettings: {} })
    );
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
    ).toEqual({
      integrationName: 'my-aws',
      description: 'Production',
    });
  });

  it('leaves out the package policy settings, which are saved only with a deploy', () => {
    expect(
      toSOMetadataUpdate({ integrationName: 'my-aws', policySettings: { output_id: 'logstash-1' } })
    ).toEqual({ integrationName: 'my-aws', description: null });
  });
});
