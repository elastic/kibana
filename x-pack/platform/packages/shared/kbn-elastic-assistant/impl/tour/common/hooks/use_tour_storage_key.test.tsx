/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../../mock/test_providers/test_providers';
import { NEW_FEATURES_TOUR_STORAGE_KEYS, NEW_TOUR_FEATURES_TOUR_STORAGE_KEYS } from '../../const';
import { useTourStorageKey } from './use_tour_storage_key';

const featureNumber = Object.keys(NEW_FEATURES_TOUR_STORAGE_KEYS).length;
const testFeatures = [
  {
    featureKey: NEW_FEATURES_TOUR_STORAGE_KEYS.KNOWLEDGE_BASE,
    expectedStorageKey:
      NEW_TOUR_FEATURES_TOUR_STORAGE_KEYS[NEW_FEATURES_TOUR_STORAGE_KEYS.KNOWLEDGE_BASE],
  },
  {
    featureKey: NEW_FEATURES_TOUR_STORAGE_KEYS.ANONYMIZED_VALUES_AND_CITATIONS,
    expectedStorageKey:
      NEW_TOUR_FEATURES_TOUR_STORAGE_KEYS[
        NEW_FEATURES_TOUR_STORAGE_KEYS.ANONYMIZED_VALUES_AND_CITATIONS
      ],
  },
  {
    featureKey: NEW_FEATURES_TOUR_STORAGE_KEYS.ELASTIC_LLM_USAGE_ATTACK_DISCOVERY,
    expectedStorageKey:
      NEW_TOUR_FEATURES_TOUR_STORAGE_KEYS[
        NEW_FEATURES_TOUR_STORAGE_KEYS.ELASTIC_LLM_USAGE_ATTACK_DISCOVERY
      ],
  },
  {
    featureKey: NEW_FEATURES_TOUR_STORAGE_KEYS.ELASTIC_LLM_USAGE_ATTACK_DISCOVERY_FLYOUT,
    expectedStorageKey:
      NEW_TOUR_FEATURES_TOUR_STORAGE_KEYS[
        NEW_FEATURES_TOUR_STORAGE_KEYS.ELASTIC_LLM_USAGE_ATTACK_DISCOVERY_FLYOUT
      ],
  },
  {
    featureKey: NEW_FEATURES_TOUR_STORAGE_KEYS.ELASTIC_LLM_USAGE_ASSISTANT_HEADER,
    expectedStorageKey:
      NEW_TOUR_FEATURES_TOUR_STORAGE_KEYS[
        NEW_FEATURES_TOUR_STORAGE_KEYS.ELASTIC_LLM_USAGE_ASSISTANT_HEADER
      ],
  },
  {
    featureKey: NEW_FEATURES_TOUR_STORAGE_KEYS.CONVERSATION_CONNECTOR_ELASTIC_LLM,
    expectedStorageKey:
      NEW_TOUR_FEATURES_TOUR_STORAGE_KEYS[
        NEW_FEATURES_TOUR_STORAGE_KEYS.CONVERSATION_CONNECTOR_ELASTIC_LLM
      ],
  },
  {
    featureKey: NEW_FEATURES_TOUR_STORAGE_KEYS.ELASTIC_LLM_USAGE_AUTOMATIC_TROUBLESHOOTING,
    expectedStorageKey:
      NEW_TOUR_FEATURES_TOUR_STORAGE_KEYS[
        NEW_FEATURES_TOUR_STORAGE_KEYS.ELASTIC_LLM_USAGE_AUTOMATIC_TROUBLESHOOTING
      ],
  },
];

describe('useTourStorageKey', () => {
  test('testFeatures length should match the number of features', () => {
    expect(testFeatures.length).toBe(featureNumber);
  });

  test.each(testFeatures)(
    'should return the correct storage key with spaceId for feature $featureKey',
    ({
      featureKey,
      expectedStorageKey,
    }: {
      featureKey: NEW_FEATURES_TOUR_STORAGE_KEYS;
      expectedStorageKey: string;
    }) => {
      const spaceId = 'default';
      const { result } = renderHook(() => useTourStorageKey(featureKey), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      expect(result.current).toBe(`${expectedStorageKey}.${spaceId}`);
    }
  );
});
