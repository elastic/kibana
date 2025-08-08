/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EcsFlat as ecsFields } from '@elastic/ecs';
import { EcsFieldsRepository, EcsFieldsRepositoryDeps } from './ecs_fields_repository';

describe('EcsFieldsRepository class', () => {
  it('should validate the EcsFlat map', async () => {
    const ecsFieldsRepository = EcsFieldsRepository.create({
      ecsFields: ecsFields as unknown as EcsFieldsRepositoryDeps['ecsFields'],
    });

    // The assertion is purely to validate the an error is triggered whether the
    // EcsFlat map is invalid.
    expect(ecsFieldsRepository).toBeInstanceOf(EcsFieldsRepository);
  });
});
