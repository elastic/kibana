/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';
import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  DETECTION_ENGINE_RULES_MAY_NOT_MATCH,
  MAPPINGS_THAT_CONFLICT_WITH_ECS,
  PAGES_MAY_NOT_DISPLAY_EVENTS,
} from '../../../../translations';
import { TestExternalProviders } from '../../../../../../../../../mock/test_providers/test_providers';
import { IncompatibleCallout } from '.';

describe('IncompatibleCallout', () => {
  beforeEach(() => {
    render(
      <TestExternalProviders>
        <IncompatibleCallout />
      </TestExternalProviders>
    );
  });

  test('it includes the ECS version in the main content', () => {
    expect(screen.getByTestId('fieldsAreIncompatible')).toHaveTextContent(
      `Fields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${EcsVersion}.`
    );
  });

  test('it warns rules may not match', () => {
    expect(screen.getByTestId('rulesMayNotMatch')).toHaveTextContent(
      DETECTION_ENGINE_RULES_MAY_NOT_MATCH
    );
  });

  test('it warns pages may not display events', () => {
    expect(screen.getByTestId('pagesMayNotDisplayEvents')).toHaveTextContent(
      PAGES_MAY_NOT_DISPLAY_EVENTS
    );
  });

  test("it warns mappings that don't comply with ECS are unsupported", () => {
    expect(screen.getByTestId('mappingsThatDontComply')).toHaveTextContent(
      MAPPINGS_THAT_CONFLICT_WITH_ECS
    );
  });
});
