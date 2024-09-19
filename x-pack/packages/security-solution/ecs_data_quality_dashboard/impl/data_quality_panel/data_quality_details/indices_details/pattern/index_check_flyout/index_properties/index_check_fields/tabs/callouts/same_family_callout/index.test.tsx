/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { FIELDS_WITH_MAPPINGS_SAME_FAMILY } from '../../../../translations';
import { TestExternalProviders } from '../../../../../../../../../mock/test_providers/test_providers';
import { SameFamilyCallout } from '.';
import { mockPartitionedFieldMetadataWithSameFamily } from '../../../../../../../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata_with_same_family';

describe('SameFamilyCallout', () => {
  beforeEach(() => {
    render(
      <TestExternalProviders>
        <SameFamilyCallout
          ecsBasedFieldMetadata={mockPartitionedFieldMetadataWithSameFamily.sameFamily}
        />
      </TestExternalProviders>
    );
  });

  test('it includes the ECS version in the main content', () => {
    expect(screen.getByTestId('fieldsDefinedByEcs')).toHaveTextContent(
      `This field is defined by the Elastic Common Schema (ECS), version ${EcsVersion}, but its mapping type doesn't exactly match.`
    );
  });

  test('it notes fields with mappings have the same behavior, but may have different space usage or performance characteristics', () => {
    expect(screen.getByTestId('fieldsWithMappingsSameFamily')).toHaveTextContent(
      FIELDS_WITH_MAPPINGS_SAME_FAMILY
    );
  });
});
