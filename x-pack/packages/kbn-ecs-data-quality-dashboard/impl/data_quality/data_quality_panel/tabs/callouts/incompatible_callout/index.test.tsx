/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@kbn/ecs';
import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  DETECTION_ENGINE_RULES_MAY_NOT_MATCH,
  INCOMPATIBLE_FIELDS_WITH,
  MAPPINGS_THAT_CONFLICT_WITH_ECS,
  PAGES_MAY_NOT_DISPLAY_EVENTS,
  WHEN_AN_INCOMPATIBLE_FIELD,
} from '../../../index_properties/translations';
import {
  eventCategory,
  eventCategoryWithUnallowedValues,
  hostNameWithTextMapping,
  sourceIpWithTextMapping,
} from '../../../../mock/enriched_field_metadata';
import { TestProviders } from '../../../../mock/test_providers';
import { EnrichedFieldMetadata } from '../../../../types';
import { IncompatibleCallout } from '.';

const content = 'Is your name Michael?';

const eventCategoryWithWIldcard: EnrichedFieldMetadata = {
  ...eventCategory, // `event.category` is a `keyword` per the ECS spec
  indexFieldType: 'wildcard', // this index has a mapping of `wildcard` instead of `keyword`
  isInSameFamily: true, // `wildcard` and `keyword` are in the same family
  isEcsCompliant: false, // wildcard !== keyword
};

describe('IncompatibleCallout', () => {
  beforeEach(() => {
    render(
      <TestProviders>
        <IncompatibleCallout
          enrichedFieldMetadata={[
            eventCategoryWithWIldcard, // isEcsCompliant: false, indexInvalidValues.length: 0, isInSameFamily: true, `wildcard` and `keyword` are in the same family
            eventCategoryWithUnallowedValues, // isEcsCompliant: false, indexInvalidValues.length: 2, isInSameFamily: true, `keyword` and `keyword` are in the same family
            hostNameWithTextMapping, // isEcsCompliant: false, indexInvalidValues.length: 0, isInSameFamily: false, `keyword` and `text` are not in the family
            sourceIpWithTextMapping, // isEcsCompliant: false, indexInvalidValues.length: 0, isInSameFamily: false, `ip` is not a member of any families
          ]}
        >
          <div data-test-subj="children">{content}</div>
        </IncompatibleCallout>
      </TestProviders>
    );
  });

  test('it renders a title with the expected incompatible and family counts', () => {
    expect(screen.getByTestId('title')).toHaveTextContent(
      '4 incompatible fields, 1 field with a mapping in the same family'
    );
  });

  test('it includes the ECS version in the main content', () => {
    expect(screen.getByTestId('fieldsAreIncompatible')).toHaveTextContent(
      `Fields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${EcsVersion}.`
    );
  });

  test('it notes that mappings in the same family have the same search, but different space and performance characteristics', () => {
    expect(screen.getByTestId('incompatibleFIeldsWith')).toHaveTextContent(
      INCOMPATIBLE_FIELDS_WITH
    );
  });

  test('it introduces the consequences of having incompatible fields not in the same family', () => {
    expect(screen.getByTestId('whenAnIncompatableField')).toHaveTextContent(
      WHEN_AN_INCOMPATIBLE_FIELD
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

  test('it renders the children', () => {
    expect(screen.getByTestId('children')).toHaveTextContent(content);
  });
});
