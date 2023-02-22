/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@kbn/ecs';

import { ECS_IS_A_PERMISSIVE_SCHEMA } from '../../index_properties/translations';
import { getCustomMarkdownComment } from './helpers';
import { hostNameKeyword, someField } from '../../../mock/enriched_field_metadata';

describe('helpers', () => {
  describe('getCustomMarkdownComment', () => {
    test('it returns a comment for custom fields with the expected field counts and ECS version', () => {
      expect(getCustomMarkdownComment({ enrichedFieldMetadata: [hostNameKeyword, someField] }))
        .toEqual(`#### 2 Custom field mappings

These fields are not defined by the Elastic Common Schema (ECS), version ${EcsVersion}.

${ECS_IS_A_PERMISSIVE_SCHEMA}
`);
    });
  });
});
