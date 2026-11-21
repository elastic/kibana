/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { useDuplicates } from './use_duplicates';
import type { ServiceInstance, ServiceVars } from './use_service_settings';

const SERVICE = {
  id: 'ebs',
  name: 'Amazon EBS',
  packageName: 'aws',
  deploymentMethods: [{ method: 'managed_integration', preferred: true }],
} as unknown as AwsServiceMatrixEntry;

const ORIGINAL: ServiceInstance = {
  instanceId: 'ebs',
  serviceId: 'ebs',
  name: 'Amazon EBS',
  isDuplicate: false,
};

const setup = ({
  duplicateName,
  duplicateNamespace,
  globalNamespace,
  deployed = false,
}: {
  duplicateName: string;
  duplicateNamespace: string;
  globalNamespace: string;
  deployed?: boolean;
}) => {
  const duplicate: ServiceInstance = {
    instanceId: 'ebs__dup-1',
    serviceId: 'ebs',
    name: duplicateName,
    isDuplicate: true,
  };
  const { result } = renderHook(() =>
    useDuplicates({
      instances: [ORIGINAL, duplicate],
      awsServicesMap: new Map([['ebs', SERVICE]]),
      allInstanceNames: [ORIGINAL.name, duplicateName],
      getServiceVars: () =>
        ({
          enabledDataStreams: [],
          varsByDataStream: {},
          namespace: duplicateNamespace,
        } as ServiceVars),
      addDuplicate: jest.fn(),
      integrationName: 'aws-1',
      globalNamespace,
      bareNamePackage: 'aws',
      deploymentMethod: 'managed_integration',
      policyIdsByInstance: deployed ? { 'ebs__dup-1': 'policy-1' } : {},
    })
  );
  return result.current;
};

describe('useDuplicates — getRenamedName', () => {
  it('renames a generated name to follow the new namespace', () => {
    const { getRenamedName } = setup({
      duplicateName: 'aws-1-staging [Duplicate]',
      duplicateNamespace: 'staging',
      globalNamespace: 'prod',
    });

    expect(getRenamedName('ebs__dup-1', 'qa')).toBe('aws-1-qa [Duplicate]');
  });

  it('renames when the duplicate had no namespace and the global one changed since', () => {
    // Generated while the global namespace was empty, which is `prod` now.
    const { getRenamedName } = setup({
      duplicateName: 'aws-1 [Duplicate]',
      duplicateNamespace: '',
      globalNamespace: 'prod',
    });

    expect(getRenamedName('ebs__dup-1', 'qa')).toBe('aws-1-qa [Duplicate]');
  });

  it('renames when the duplicate had no namespace and the name follows the global one', () => {
    const { getRenamedName } = setup({
      duplicateName: 'aws-1-prod [Duplicate]',
      duplicateNamespace: '',
      globalNamespace: 'prod',
    });

    expect(getRenamedName('ebs__dup-1', 'qa')).toBe('aws-1-qa [Duplicate]');
  });

  it('keeps a name the user chose', () => {
    const { getRenamedName } = setup({
      duplicateName: 'my copy',
      duplicateNamespace: 'staging',
      globalNamespace: 'prod',
    });

    expect(getRenamedName('ebs__dup-1', 'qa')).toBeUndefined();
  });

  it('keeps the name of a deployed duplicate, whose policy keeps its name', () => {
    const { getRenamedName } = setup({
      duplicateName: 'aws-1-staging [Duplicate]',
      duplicateNamespace: 'staging',
      globalNamespace: 'prod',
      deployed: true,
    });

    expect(getRenamedName('ebs__dup-1', 'qa')).toBeUndefined();
  });

  it('does not rename an original', () => {
    const { getRenamedName } = setup({
      duplicateName: 'aws-1-staging [Duplicate]',
      duplicateNamespace: 'staging',
      globalNamespace: 'prod',
    });

    expect(getRenamedName('ebs', 'qa')).toBeUndefined();
  });
});
