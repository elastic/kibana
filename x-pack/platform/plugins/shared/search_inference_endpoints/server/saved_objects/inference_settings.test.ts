/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { createModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';
import { chatCompletionReasoningEfforts } from '@kbn/inference-common';
import { INFERENCE_SETTINGS_ID, INFERENCE_SETTINGS_SO_TYPE } from '../../common/constants';
import { createInferenceSettingsSavedObjectType } from './inference_settings';
import { inferenceSettingsSchemaV2 } from './schema/v2';

const withEndpoint = (endpoint: Record<string, unknown>) => ({
  features: [{ feature_id: 'agent_builder', endpoints: [endpoint] }],
});

const createDocument = (attributes: Record<string, unknown>): SavedObject => ({
  id: INFERENCE_SETTINGS_ID,
  type: INFERENCE_SETTINGS_SO_TYPE,
  attributes,
  references: [],
});

describe('inference settings saved object type', () => {
  const migrator = createModelVersionTestMigrator({
    type: createInferenceSettingsSavedObjectType(),
  });

  it('keeps a v1 document without parameters unchanged when migrating to v2', () => {
    const document = createDocument(withEndpoint({ id: '.anthropic-claude-3.7-sonnet' }));

    const migrated = migrator.migrate({ document, fromVersion: 1, toVersion: 2 });

    expect(migrated.attributes).toEqual(document.attributes);
  });

  it('strips parameters from a v2 document through the v1 forward-compatibility schema', () => {
    const document = createDocument(
      withEndpoint({ id: 'openai-gpt-5.4', parameters: { reasoning: { effort: 'high' } } })
    );

    const migrated = migrator.migrate({ document, fromVersion: 2, toVersion: 1 });

    expect(migrated.attributes).toEqual(withEndpoint({ id: 'openai-gpt-5.4' }));
  });

  describe('version 2 schema', () => {
    it('accepts an endpoint without parameters', () => {
      expect(() =>
        inferenceSettingsSchemaV2.validate(withEndpoint({ id: 'openai-gpt-5.4' }))
      ).not.toThrow();
    });

    it('accepts an endpoint with reasoning effort', () => {
      const attributes = withEndpoint({
        id: 'openai-gpt-5.4',
        parameters: { reasoning: { effort: 'high' } },
      });

      expect(inferenceSettingsSchemaV2.validate(attributes)).toEqual(attributes);
    });

    it.each(chatCompletionReasoningEfforts)('accepts the "%s" reasoning effort', (effort) => {
      expect(() =>
        inferenceSettingsSchemaV2.validate(
          withEndpoint({ id: 'openai-gpt-5.4', parameters: { reasoning: { effort } } })
        )
      ).not.toThrow();
    });

    it('rejects an unknown reasoning effort', () => {
      expect(() =>
        inferenceSettingsSchemaV2.validate(
          withEndpoint({ id: 'openai-gpt-5.4', parameters: { reasoning: { effort: 'max' } } })
        )
      ).toThrow();
    });

    it('rejects unknown parameter keys', () => {
      expect(() =>
        inferenceSettingsSchemaV2.validate(
          withEndpoint({ id: 'openai-gpt-5.4', parameters: { topP: 0.5 } })
        )
      ).toThrow();
    });
  });
});
