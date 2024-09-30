/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { ECS_IS_A_PERMISSIVE_SCHEMA } from '../../../../translations';
import {
  hostNameKeyword,
  someField,
} from '../../../../../../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { TestExternalProviders } from '../../../../../../../../../mock/test_providers/test_providers';
import { CustomCallout } from '.';

describe('CustomCallout', () => {
  beforeEach(() => {
    render(
      <TestExternalProviders>
        <CustomCallout customFieldMetadata={[hostNameKeyword, someField]} />
      </TestExternalProviders>
    );
  });

  test('it includes the ECS version in the main content', () => {
    expect(screen.getByTestId('fieldsNotDefinedByEcs')).toHaveTextContent(
      `These fields are not defined by the Elastic Common Schema (ECS), version ${EcsVersion}.`
    );
  });

  test('it notes ECS is a permissive schema', () => {
    expect(screen.getByTestId('ecsIsPermissive')).toHaveTextContent(ECS_IS_A_PERMISSIVE_SCHEMA);
  });
});
