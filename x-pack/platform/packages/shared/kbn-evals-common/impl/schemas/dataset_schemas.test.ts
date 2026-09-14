/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_DATASET_DESCRIPTION_LENGTH,
  MAX_DATASET_NAME_LENGTH,
  MAX_TAGS_PER_DATASET,
  MAX_TAG_LENGTH,
} from '../../constants';
import { DatasetMaturity, DatasetTags } from './common_attributes.gen';
import { CreateEvaluationDatasetRequestBody } from './datasets/create_dataset_route.gen';
import { UpdateEvaluationDatasetRequestBody } from './datasets/update_dataset_route.gen';
import { UpsertEvaluationDatasetRequestBody } from './datasets/upsert_dataset_route.gen';

describe('dataset schemas', () => {
  it('accepts every DatasetMaturity level on the update route', () => {
    for (const level of DatasetMaturity.options) {
      expect(UpdateEvaluationDatasetRequestBody.safeParse({ maturity: level }).success).toBe(true);
    }

    expect(UpdateEvaluationDatasetRequestBody.safeParse({ maturity: null }).success).toBe(true);
    expect(UpdateEvaluationDatasetRequestBody.safeParse({ maturity: 'pristine' }).success).toBe(
      false
    );
  });

  it('bounds dataset name and description at the documented limits', () => {
    const name = 'a'.repeat(MAX_DATASET_NAME_LENGTH);
    const description = 'b'.repeat(MAX_DATASET_DESCRIPTION_LENGTH);

    for (const schema of [CreateEvaluationDatasetRequestBody, UpsertEvaluationDatasetRequestBody]) {
      expect(schema.safeParse({ name, description, examples: [] }).success).toBe(true);
      expect(schema.safeParse({ name: `${name}a`, description, examples: [] }).success).toBe(false);
      expect(schema.safeParse({ name, description: `${description}b`, examples: [] }).success).toBe(
        false
      );
      expect(schema.safeParse({ name: '', description, examples: [] }).success).toBe(false);
    }

    expect(UpdateEvaluationDatasetRequestBody.safeParse({ description }).success).toBe(true);
    expect(
      UpdateEvaluationDatasetRequestBody.safeParse({ description: `${description}b` }).success
    ).toBe(false);
  });

  it('keeps the tag schema in step with the tag limits', () => {
    const tags = Array.from({ length: MAX_TAGS_PER_DATASET + 1 }, (_, index) => `tag-${index}`);
    expect(DatasetTags.safeParse(tags.slice(0, MAX_TAGS_PER_DATASET)).success).toBe(true);
    expect(DatasetTags.safeParse(tags).success).toBe(false);

    expect(DatasetTags.safeParse(['a'.repeat(MAX_TAG_LENGTH)]).success).toBe(true);
    expect(DatasetTags.safeParse(['a'.repeat(MAX_TAG_LENGTH + 1)]).success).toBe(false);
  });
});
