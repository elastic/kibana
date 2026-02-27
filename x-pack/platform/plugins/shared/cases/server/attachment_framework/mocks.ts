/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type {
  ExternalReferenceSOAttachmentAttributes,
  ExternalReferenceNoSOAttachmentAttributes,
  PersistableStateAttachmentAttributes,
  PersistableStateAttachmentPayload,
} from '../../common/types/domain';
import {
  AttachmentType,
  ExternalReferenceStorageType,
  SECURITY_SOLUTION_OWNER,
} from '../../common';
import { ExternalReferenceAttachmentTypeRegistry } from './external_reference_registry';
import { PersistableStateAttachmentTypeRegistry } from './persistable_state_registry';
import type {
  PersistableStateAttachmentTypeSetup,
  PersistableStateAttachmentState,
  ExternalReferenceAttachmentType,
} from './types';
import { UnifiedAttachmentTypeRegistry } from './unified_attachment_registry';

export const getPersistableAttachment = (): PersistableStateAttachmentTypeSetup => ({
  id: '.test',
  inject: (state, references) => ({
    ...state,
    persistableStateAttachmentState: {
      ...state.persistableStateAttachmentState,
      injectedId: 'testRef',
    },
  }),
  extract: (state) => ({
    state: {
      ...state,
      persistableStateAttachmentTypeId: '.test',
      persistableStateAttachmentState: { foo: 'foo' },
    },
    references: [{ id: 'testRef', name: 'myTestReference', type: 'test-so' }],
  }),
});

export const getExternalReferenceAttachment = (): ExternalReferenceAttachmentType => ({
  id: '.test',
});

export const externalReferenceAttachmentSO = {
  type: AttachmentType.externalReference as const,
  externalReferenceId: 'my-id',
  externalReferenceStorage: {
    type: ExternalReferenceStorageType.savedObject as const,
    soType: 'test-so',
  },
  externalReferenceAttachmentTypeId: '.test',
  externalReferenceMetadata: null,
  owner: SECURITY_SOLUTION_OWNER,
};

export const externalReferenceAttachmentES = {
  type: AttachmentType.externalReference as const,
  externalReferenceId: 'my-id',
  externalReferenceStorage: {
    type: ExternalReferenceStorageType.elasticSearchDoc as const,
  },
  externalReferenceAttachmentTypeId: '.test',
  externalReferenceMetadata: null,
  owner: SECURITY_SOLUTION_OWNER,
};

export const externalReferenceAttachmentSOAttributes: ExternalReferenceSOAttachmentAttributes = {
  ...externalReferenceAttachmentSO,
  created_at: '2019-11-25T22:32:30.608Z',
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  updated_at: null,
  updated_by: null,
  pushed_at: null,
  pushed_by: null,
};

export const externalReferenceAttachmentESAttributes: ExternalReferenceNoSOAttachmentAttributes = {
  ...externalReferenceAttachmentES,
  created_at: '2019-11-25T22:32:30.608Z',
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  updated_at: null,
  updated_by: null,
  pushed_at: null,
  pushed_by: null,
};

export const persistableStateAttachmentStateOnly: PersistableStateAttachmentState = {
  persistableStateAttachmentTypeId: '.test',
  persistableStateAttachmentState: { foo: 'foo', injectedId: 'testRef' },
};

export const persistableStateAttachment: PersistableStateAttachmentPayload = {
  ...persistableStateAttachmentStateOnly,
  type: AttachmentType.persistableState,
  owner: 'securitySolutionFixture',
};

export const persistableStateAttachmentAttributes: PersistableStateAttachmentAttributes = {
  ...persistableStateAttachment,
  type: AttachmentType.persistableState,
  owner: 'securitySolutionFixture',
  created_at: '2019-11-25T22:32:30.608Z',
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  updated_at: null,
  updated_by: null,
  pushed_at: null,
  pushed_by: null,
};

export const persistableStateAttachmentAttributesWithoutInjectedId = omit(
  persistableStateAttachmentAttributes,
  'persistableStateAttachmentState.injectedId'
);

export const externalReferenceAttachmentSOAttributesWithoutRefs = omit(
  externalReferenceAttachmentSOAttributes,
  'externalReferenceId'
);

export const createPersistableStateAttachmentTypeRegistryMock =
  (): PersistableStateAttachmentTypeRegistry => {
    const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
    persistableStateAttachmentTypeRegistry.register(getPersistableAttachment());

    return persistableStateAttachmentTypeRegistry;
  };

export const createExternalReferenceAttachmentTypeRegistryMock =
  (): ExternalReferenceAttachmentTypeRegistry => {
    const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
    externalReferenceAttachmentTypeRegistry.register(getExternalReferenceAttachment());

    return externalReferenceAttachmentTypeRegistry;
  };

export const createUnifiedAttachmentTypeRegistryMock = (): UnifiedAttachmentTypeRegistry => {
  const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
  return unifiedAttachmentTypeRegistry;
};
