/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { RuleDoctorExecutionSummary } from '../../workflows/rule_doctor_workflow';
import { RULE_DOCTOR_COVERAGE_STATE_INDEX } from '../../resources/indices/rule_doctor_coverage_state';

interface DataViewInfo {
  name: string;
  id: string;
}

export const enrichExecutionsWithDataViewNames = async (
  executions: RuleDoctorExecutionSummary[],
  esClient: ElasticsearchClient
): Promise<void> => {
  const coverageIds = executions
    .filter((e) => e.insightType === 'coverage_gap' && !e.dataViewName)
    .map((e) => e.id);

  if (coverageIds.length === 0) return;

  const dvInfoMap = await lookupDataViewInfo(coverageIds, esClient);

  for (const exec of executions) {
    const info = dvInfoMap.get(exec.id);
    if (info && !exec.dataViewName) {
      const mutable = exec as {
        dataViewName: string | null;
        dataViewId: string | null;
      };
      mutable.dataViewName = info.name;
      mutable.dataViewId = info.id;
    }
  }
};

const lookupDataViewInfo = async (
  executionIds: string[],
  esClient: ElasticsearchClient
): Promise<Map<string, DataViewInfo>> => {
  const map = new Map<string, DataViewInfo>();
  try {
    const response = await esClient.search({
      index: RULE_DOCTOR_COVERAGE_STATE_INDEX,
      size: executionIds.length,
      query: {
        bool: {
          filter: [
            { terms: { execution_id: executionIds } },
            { term: { status: 'scheduled' } },
          ],
        },
      },
      _source: ['execution_id', 'data_view_name', 'data_view_id'],
    });

    for (const hit of response.hits.hits) {
      const source = hit._source as {
        execution_id: string;
        data_view_name: string;
        data_view_id: string;
      };
      if (source.execution_id && source.data_view_name) {
        map.set(source.execution_id, {
          name: source.data_view_name,
          id: source.data_view_id ?? '',
        });
      }
    }
  } catch {
    // State index may not exist yet
  }
  return map;
};
