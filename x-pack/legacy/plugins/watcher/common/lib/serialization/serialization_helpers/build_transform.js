/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { singleLineScript } from './single_line_script';
import { COMPARATORS } from '../../../../common/constants';
const { BETWEEN } = COMPARATORS;
/*
watch.transform.script.inline
 */
function buildInline(aggType, thresholdComparator, hasTermsAgg) {
  let script = '';

  if (aggType === 'count' && !hasTermsAgg) {
    script = `
      HashMap result = new HashMap();
      result.result = ctx.payload.hits.total;

      return result;
    `;
  }

  if (aggType === 'count' && hasTermsAgg) {
    if (thresholdComparator === BETWEEN) {
      script = `
      HashMap result = new HashMap();
      ArrayList arr = ctx.payload.aggregations.bucketAgg.buckets;
      ArrayList filteredHits = new ArrayList();

      for (int i = 0; i < arr.length; i++) {
        HashMap filteredHit = new HashMap();
        filteredHit.key = arr[i].key;
        filteredHit.value = arr[i].doc_count;
        if (filteredHit.value >= params.threshold[0] && filteredHit.value <= params.threshold[1]) {
          filteredHits.add(filteredHit);
        }
      }
      result.results = filteredHits;

      return result;
    `;
    } else {
      script = `
      HashMap result = new HashMap();
      ArrayList arr = ctx.payload.aggregations.bucketAgg.buckets;
      ArrayList filteredHits = new ArrayList();

      for (int i = 0; i < arr.length; i++) {
        HashMap filteredHit = new HashMap();
        filteredHit.key = arr[i].key;
        filteredHit.value = arr[i].doc_count;
        if (filteredHit.value ${thresholdComparator} params.threshold) {
          filteredHits.add(filteredHit);
        }
      }
      result.results = filteredHits;

      return result;
    `;
    }
  }

  if (aggType !== 'count' && !hasTermsAgg) {
    script = `
      HashMap result = new HashMap();
      result.result = ctx.payload.aggregations.metricAgg.value;

      return result;
    `;
  }

  if (aggType !== 'count' && hasTermsAgg) {
    if (thresholdComparator === BETWEEN) {
      script = `
      HashMap result = new HashMap();
      ArrayList arr = ctx.payload.aggregations.bucketAgg.buckets;
      ArrayList filteredHits = new ArrayList();

      for (int i = 0; i < arr.length; i++) {
        HashMap filteredHit = new HashMap();
        filteredHit.key = arr[i].key;
        filteredHit.value = arr[i]['metricAgg'].value;
        if (filteredHit.value >= params.threshold[0] && filteredHit.value <= params.threshold[1]) {
          filteredHits.add(filteredHit);
        }
      }
      result.results = filteredHits;

      return result;
    `;
    } else {
      script = `
      HashMap result = new HashMap();
      ArrayList arr = ctx.payload.aggregations.bucketAgg.buckets;
      ArrayList filteredHits = new ArrayList();

      for (int i = 0; i < arr.length; i++) {
        HashMap filteredHit = new HashMap();
        filteredHit.key = arr[i].key;
        filteredHit.value = arr[i]['metricAgg'].value;
        if (filteredHit.value ${thresholdComparator} params.threshold) {
          filteredHits.add(filteredHit);
        }
      }
      result.results = filteredHits;

      return result;
    `;
    }
  }

  return singleLineScript(script);
}

/*
watch.transform.script.params
 */
function buildParams(threshold) {
  return {
    threshold,
  };
}

/*
watch.transform
 */
export function buildTransform({ aggType, thresholdComparator, hasTermsAgg, threshold }) {
  return {
    script: {
      source: buildInline(aggType, thresholdComparator, hasTermsAgg),
      params: buildParams(threshold),
    },
  };
}
