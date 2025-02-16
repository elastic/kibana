/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchGeneric } from '@kbn/search-types';
import { lastValueFrom } from 'rxjs';
import { fromPromise } from 'xstate5';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import { z } from '@kbn/zod';
import { LogCategorizationParams } from './types';
import { createCategorizationRequestParams } from './queries';
import { LogCategory, LogCategoryChange } from '../../types';

// the fraction of a category's histogram below which the category is considered rare
const rarityThreshold = 0.2;
const maxCategoriesCount = 1000;

export const categorizeDocuments = ({ search }: { search: ISearchGeneric }) =>
  fromPromise<
    {
      categories: LogCategory[];
      hasReachedLimit: boolean;
    },
    LogCategorizationParams & {
      samplingProbability: number;
      ignoredCategoryTerms: string[];
      minDocsPerCategory: number;
    }
  >(
    async ({
      input: {
        index,
        endTimestamp,
        startTimestamp,
        timeField,
        messageField,
        samplingProbability,
        ignoredCategoryTerms,
        documentFilters = [],
        minDocsPerCategory,
      },
      signal,
    }) => {
      const randomSampler = createRandomSamplerWrapper({
        probability: samplingProbability,
        seed: 1,
      });

      const requestParams = createCategorizationRequestParams({
        index,
        timeField,
        messageField,
        startTimestamp,
        endTimestamp,
        randomSampler,
        additionalFilters: documentFilters,
        ignoredCategoryTerms,
        minDocsPerCategory,
        maxCategoriesCount,
      });

      const { rawResponse } = await lastValueFrom(
        search({ params: requestParams }, { abortSignal: signal })
      );

      if (rawResponse.aggregations == null) {
        throw new Error('No aggregations found in large categories response');
      }

      const logCategoriesAggResult = randomSampler.unwrap(rawResponse.aggregations);

      if (!('categories' in logCategoriesAggResult)) {
        throw new Error('No categorization aggregation found in large categories response');
      }

      const logCategories =
        (logCategoriesAggResult.categories.buckets as unknown[]).map(mapCategoryBucket) ?? [];

      return {
        categories: logCategories,
        hasReachedLimit: logCategories.length >= maxCategoriesCount,
      };
    }
  );

const mapCategoryBucket = (bucket: any): LogCategory =>
  esCategoryBucketSchema
    .transform((parsedBucket) => ({
      change: mapChangePoint(parsedBucket),
      documentCount: parsedBucket.doc_count,
      histogram: parsedBucket.histogram,
      terms: parsedBucket.key,
    }))
    .parse(bucket);

const mapChangePoint = ({ change, histogram }: EsCategoryBucket): LogCategoryChange => {
  switch (change.type) {
    case 'stationary':
      if (isRareInHistogram(histogram)) {
        return {
          type: 'rare',
          timestamp: findFirstNonZeroBucket(histogram)?.timestamp ?? histogram[0].timestamp,
        };
      } else {
        return {
          type: 'none',
        };
      }
    case 'dip':
    case 'spike':
      return {
        type: change.type,
        timestamp: change.bucket.key,
      };
    case 'step_change':
      return {
        type: 'step',
        timestamp: change.bucket.key,
      };
    case 'distribution_change':
      return {
        type: 'distribution',
        timestamp: change.bucket.key,
      };
    case 'trend_change':
      return {
        type: 'trend',
        timestamp: change.bucket.key,
        correlationCoefficient: change.details.r_value,
      };
    case 'unknown':
      return {
        type: 'unknown',
        rawChange: change.rawChange,
      };
    case 'non_stationary':
    default:
      return {
        type: 'other',
      };
  }
};

/**
 * The official types are lacking the change_point aggregation
 */
const esChangePointBucketSchema = z.object({
  key: z.string().datetime(),
  doc_count: z.number(),
});

const esChangePointDetailsSchema = z.object({
  p_value: z.number(),
});

const esChangePointCorrelationSchema = esChangePointDetailsSchema.extend({
  r_value: z.number(),
});

const esChangePointSchema = z.union([
  z
    .object({
      bucket: esChangePointBucketSchema,
      type: z.object({
        dip: esChangePointDetailsSchema,
      }),
    })
    .transform(({ bucket, type: { dip: details } }) => ({
      type: 'dip' as const,
      bucket,
      details,
    })),
  z
    .object({
      bucket: esChangePointBucketSchema,
      type: z.object({
        spike: esChangePointDetailsSchema,
      }),
    })
    .transform(({ bucket, type: { spike: details } }) => ({
      type: 'spike' as const,
      bucket,
      details,
    })),
  z
    .object({
      bucket: esChangePointBucketSchema,
      type: z.object({
        step_change: esChangePointDetailsSchema,
      }),
    })
    .transform(({ bucket, type: { step_change: details } }) => ({
      type: 'step_change' as const,
      bucket,
      details,
    })),
  z
    .object({
      bucket: esChangePointBucketSchema,
      type: z.object({
        trend_change: esChangePointCorrelationSchema,
      }),
    })
    .transform(({ bucket, type: { trend_change: details } }) => ({
      type: 'trend_change' as const,
      bucket,
      details,
    })),
  z
    .object({
      bucket: esChangePointBucketSchema,
      type: z.object({
        distribution_change: esChangePointDetailsSchema,
      }),
    })
    .transform(({ bucket, type: { distribution_change: details } }) => ({
      type: 'distribution_change' as const,
      bucket,
      details,
    })),
  z
    .object({
      type: z.object({
        non_stationary: esChangePointCorrelationSchema.extend({
          trend: z.enum(['increasing', 'decreasing']),
        }),
      }),
    })
    .transform(({ type: { non_stationary: details } }) => ({
      type: 'non_stationary' as const,
      details,
    })),
  z
    .object({
      type: z.object({
        stationary: z.object({}),
      }),
    })
    .transform(() => ({ type: 'stationary' as const })),
  z
    .object({
      type: z.object({}),
    })
    .transform((value) => ({ type: 'unknown' as const, rawChange: JSON.stringify(value) })),
]);

const esHistogramSchema = z
  .object({
    buckets: z.array(
      z
        .object({
          key_as_string: z.string(),
          doc_count: z.number(),
        })
        .transform((bucket) => ({
          timestamp: bucket.key_as_string,
          documentCount: bucket.doc_count,
        }))
    ),
  })
  .transform(({ buckets }) => buckets);

type EsHistogram = z.output<typeof esHistogramSchema>;

const esCategoryBucketSchema = z.object({
  key: z.string(),
  doc_count: z.number(),
  change: esChangePointSchema,
  histogram: esHistogramSchema,
});

type EsCategoryBucket = z.output<typeof esCategoryBucketSchema>;

const isRareInHistogram = (histogram: EsHistogram): boolean =>
  histogram.filter((bucket) => bucket.documentCount > 0).length <
  histogram.length * rarityThreshold;

const findFirstNonZeroBucket = (histogram: EsHistogram) =>
  histogram.find((bucket) => bucket.documentCount > 0);
