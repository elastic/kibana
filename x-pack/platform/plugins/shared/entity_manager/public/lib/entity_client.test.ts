/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityClient } from './entity_client';
import { coreMock } from '@kbn/core/public/mocks';
import type { EntityInstance } from '@kbn/entities-schema';

const commonEntityFields: EntityInstance = {
  entity: {
    last_seen_timestamp: '2023-10-09T00:00:00Z',
    id: '1',
    display_name: 'entity_name',
    definition_id: 'entity_definition_id',
  } as EntityInstance['entity'],
};

type Entity = { [key: string]: any } & { entityIdentityFields: { [key: string]: string[] } };

describe('EntityClient', () => {
  let entityClient: EntityClient;

  beforeEach(() => {
    entityClient = new EntityClient(coreMock.createStart());
  });

  describe('asKqlFilter', () => {
    it('should return the kql filter', () => {
      const entity: Entity = {
        ...commonEntityFields.entity,
        entityIdentityFields: { source1: ['service.name', 'service.environment'] },
        type: 'service',
        ['service.name']: 'my-service',
      };

      const result = entityClient.asKqlFilter({ entity });
      expect(result).toEqual('service.name: "my-service"');
    });

    it('should return the kql filter when an identity field value contain special characters', () => {
      const entity: Entity = {
        ...commonEntityFields.entity,
        entityIdentityFields: { source1: ['host.name', 'foo.bar'] },
        type: 'service',
        ['host.name']: 'my-host:some-value:some-other-value',
      };

      const result = entityClient.asKqlFilter({ entity });
      expect(result).toEqual('host.name: "my-host:some-value:some-other-value"');
    });

    it('should return the kql filter when identity_fields is composed by multiple fields', () => {
      const entity: Entity = {
        ...commonEntityFields.entity,
        entityIdentityFields: { source1: ['service.name', 'service.environment'] },
        type: 'service',
        ['service.name']: 'my-service',
        ['service.environment']: 'staging',
      };

      const result = entityClient.asKqlFilter({ entity });
      expect(result).toEqual('(service.name: "my-service" AND service.environment: "staging")');
    });

    it('should ignore fields that are not present in the entity', () => {
      const entity: Entity = {
        ...commonEntityFields.entity,
        entityIdentityFields: { source1: ['host.name', 'foo.bar'] },
        ['host.name']: 'my-host',
      };

      const result = entityClient.asKqlFilter({ entity });
      expect(result).toEqual('host.name: "my-host"');
    });
  });

  describe('getIdentityFieldsValue', () => {
    it('should return identity fields values', () => {
      const entity: Entity = {
        ...commonEntityFields.entity,
        entityIdentityFields: { source1: ['service.name', 'service.environment'] },
        type: 'service',
        ['service.name']: 'my-service',
      };

      expect(entityClient.getIdentityFieldsValue({ entity })).toEqual({
        'service.name': 'my-service',
      });
    });

    it('should return identity fields values when identity_fields is composed by multiple fields', () => {
      const entity: Entity = {
        ...commonEntityFields.entity,
        entityIdentityFields: { source1: ['service.name', 'service.environment'] },
        type: 'service',
        ['service.name']: 'my-service',
        ['service.environment']: 'staging',
      };

      expect(entityClient.getIdentityFieldsValue({ entity })).toEqual({
        'service.name': 'my-service',
        'service.environment': 'staging',
      });
    });

    it('should return identity fields when field is in the root', () => {
      const entity: Entity = {
        ...commonEntityFields.entity,
        entityIdentityFields: { source1: ['name'] },
        type: 'service',
        name: 'foo',
      };

      expect(entityClient.getIdentityFieldsValue({ entity })).toEqual({
        name: 'foo',
      });
    });

    it('should throw an error when identity fields are missing', () => {
      const entity: Entity = {
        ...commonEntityFields.entity,
        entityIdentityFields: {},
      };

      expect(() => entityClient.getIdentityFieldsValue({ entity })).toThrow(
        'Identity fields are missing'
      );
    });
  });
});
