/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@kbn/ecs';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { ECS_IS_A_PERMISSIVE_SCHEMA } from '../../../index_properties/translations';
import {
  hostNameKeyword,
  someField,
} from '../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { TestProviders } from '../../../../mock/test_providers/test_providers';
import { CustomCallout } from '.';

const content = 'you are reviewing a pull request';

describe('CustomCallout', () => {
  beforeEach(() => {
    render(
      <TestProviders>
        <CustomCallout enrichedFieldMetadata={[hostNameKeyword, someField]}>
          <div data-test-subj="children">{content}</div>
        </CustomCallout>
      </TestProviders>
    );
  });

  test('it renders a title with the expected count of custom field mappings', () => {
    expect(screen.getByTestId('title')).toHaveTextContent('2 Custom field mappings');
  });

  test('it includes the ECS version in the main content', () => {
    expect(screen.getByTestId('fieldsNotDefinedByEcs')).toHaveTextContent(
      `These fields are not defined by the Elastic Common Schema (ECS), version ${EcsVersion}.`
    );
  });

  test('it notes ECS is a permissive schema', () => {
    expect(screen.getByTestId('ecsIsPermissive')).toHaveTextContent(ECS_IS_A_PERMISSIVE_SCHEMA);
  });

  test('it renders the children', () => {
    expect(screen.getByTestId('children')).toHaveTextContent(content);
  });
});
