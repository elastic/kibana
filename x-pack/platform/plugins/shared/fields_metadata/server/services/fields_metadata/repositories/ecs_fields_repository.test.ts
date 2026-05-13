/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EcsFlat as ecsFields } from '@elastic/ecs';
import type { EcsFieldsRepositoryDeps } from './ecs_fields_repository';
import { EcsFieldsRepository } from './ecs_fields_repository';

describe('EcsFieldsRepository class', () => {
  it('should validate the EcsFlat map', async () => {
    const ecsFieldsRepository = EcsFieldsRepository.create({
      ecsFields: ecsFields as unknown as EcsFieldsRepositoryDeps['ecsFields'],
    });

    // The assertion is purely to validate the an error is triggered whether the
    // EcsFlat map is invalid.
    expect(ecsFieldsRepository).toBeInstanceOf(EcsFieldsRepository);
  });

  describe('getByName with prefix handling', () => {
    let ecsFieldsRepository: EcsFieldsRepository;

    beforeEach(() => {
      // Create a mock ECS fields map with base fields (without prefixes)
      const mockEcsFields = {
        'host.name': {
          name: 'name',
          flat_name: 'host.name',
          type: 'keyword',
          description: 'Host name',
        },
        'service.name': {
          name: 'service.name',
          flat_name: 'service.name',
          type: 'keyword',
          description: 'Service name',
        },
        'deployment.environment': {
          name: 'deployment.environment',
          flat_name: 'deployment.environment',
          type: 'keyword',
          description: 'Deployment environment',
        },
      };

      ecsFieldsRepository = EcsFieldsRepository.create({
        ecsFields: mockEcsFields as unknown as EcsFieldsRepositoryDeps['ecsFields'],
      });
    });

    it('should find field with direct lookup and preserve original name', () => {
      const field = ecsFieldsRepository.getByName('host.name');
      expect(field).toBeDefined();
      expect(field?.name).toBe('name');
      expect(field?.flat_name).toBe('host.name');
    });

    it('should find field with attributes prefix and return prefixed name', () => {
      const field = ecsFieldsRepository.getByName('attributes.service.name');
      expect(field).toBeDefined();
      expect(field?.name).toBe('attributes.service.name');
      expect(field?.flat_name).toBe('attributes.service.name');
      expect(field?.description).toBe('Service name');
    });

    it('should find field with resource.attributes prefix and return prefixed name', () => {
      const field = ecsFieldsRepository.getByName('resource.attributes.deployment.environment');
      expect(field).toBeDefined();
      expect(field?.name).toBe('resource.attributes.deployment.environment');
      expect(field?.flat_name).toBe('resource.attributes.deployment.environment');
      expect(field?.description).toBe('Deployment environment');
    });

    it('should handle resource.attributes prefix correctly', () => {
      const field = ecsFieldsRepository.getByName('resource.attributes.service.name');
      expect(field).toBeDefined();
      expect(field?.name).toBe('resource.attributes.service.name');
      expect(field?.flat_name).toBe('resource.attributes.service.name');
      expect(field?.description).toBe('Service name');
    });

    it('should return undefined when field is not found even with prefix lookup', () => {
      const field = ecsFieldsRepository.getByName('attributes.nonexistent.field');
      expect(field).toBeUndefined();
    });

    it('should return undefined for completely nonexistent field', () => {
      const field = ecsFieldsRepository.getByName('nonexistent.field');
      expect(field).toBeUndefined();
    });
  });
});
