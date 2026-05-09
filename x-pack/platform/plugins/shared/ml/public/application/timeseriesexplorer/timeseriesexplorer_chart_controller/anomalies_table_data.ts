/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, has } from 'lodash';
import { map, type Observable } from 'rxjs';
import type { MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';

import type { CriteriaField } from '@kbn/ml-common-types/results';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';

import { ANOMALIES_TABLE_DEFAULT_QUERY_SIZE } from '../../../../common/constants/search';
import type { MlApi } from '../../services/ml_api_service';
import { normalizeSeverityThresholdForApi } from './normalize_table_severity';

export interface AnomaliesTableEnrichmentJobService {
  source: 'jobService';
  detectorsByJob: Record<
    string,
    Record<number, { detector_description?: string; custom_rules?: unknown[] }>
  >;
  customUrlsByJob: Record<string, unknown>;
}

export interface AnomaliesTableEnrichmentSingleJob {
  source: 'singleJob';
  selectedJob: Pick<Job, 'job_id' | 'analysis_config' | 'custom_settings'>;
}

export type AnomaliesTableEnrichment =
  | AnomaliesTableEnrichmentJobService
  | AnomaliesTableEnrichmentSingleJob;

export interface FetchAnomaliesTableDataParams {
  mlApi: MlApi;
  jobId: string;
  criteriaFields: CriteriaField[];
  tableInterval: string;
  /** Raw severity from props; normalized before calling the API. */
  tableSeverity: unknown;
  earliestMs: number;
  latestMs: number;
  dateFormatTz: string;
  functionDescription?: string;
  enrichment: AnomaliesTableEnrichment;
}

/** In-place fields written by {@link enrichAnomalies} for the anomalies table UI. */
type EnrichableAnomalyRow = MlAnomaliesTableRecord & {
  detector?: string;
  rulesLength?: number;
};

function enrichAnomalies(
  anomalies: MlAnomaliesTableRecord[],
  enrichment: AnomaliesTableEnrichment
) {
  anomalies.forEach((row) => {
    const anomaly = row as EnrichableAnomalyRow;
    const jobId = anomaly.jobId;
    let detector: { detector_description?: string; custom_rules?: unknown[] } | undefined;

    if (enrichment.source === 'jobService') {
      detector = get(enrichment.detectorsByJob, [jobId, anomaly.detectorIndex]);
    } else {
      const jobDetectors = enrichment.selectedJob.analysis_config.detectors;
      detector = jobDetectors[anomaly.detectorIndex];
    }

    anomaly.detector = get(detector, ['detector_description'], anomaly.source.function_description);
    // For detectors with rules, add a property with the rule count.
    const customRules = detector && 'custom_rules' in detector ? detector.custom_rules : undefined;
    if (Array.isArray(customRules)) {
      anomaly.rulesLength = customRules.length;
    }

    if (enrichment.source === 'jobService') {
      // Add properties used for building the links menu.
      if (has(enrichment.customUrlsByJob, jobId)) {
        anomaly.customUrls = enrichment.customUrlsByJob[
          jobId
        ] as MlAnomaliesTableRecord['customUrls'];
      }
    } else if (
      enrichment.selectedJob.custom_settings &&
      enrichment.selectedJob.custom_settings.custom_urls
    ) {
      anomaly.customUrls = enrichment.selectedJob.custom_settings.custom_urls;
    }
  });
}

/**
 * Shared anomalies table pipeline for SMV page and embeddable chart.
 */
export function fetchAnomaliesTableData$({
  tableSeverity,
  mlApi,
  jobId,
  criteriaFields,
  tableInterval,
  earliestMs,
  latestMs,
  dateFormatTz,
  functionDescription,
  enrichment,
}: FetchAnomaliesTableDataParams): Observable<{
  tableData: {
    anomalies: unknown[];
    interval: unknown;
    examplesByJobId: unknown;
    showViewSeriesLink: boolean;
  };
}> {
  const threshold = normalizeSeverityThresholdForApi(tableSeverity);

  return mlApi.results
    .getAnomaliesTableData(
      [jobId],
      criteriaFields as unknown as string[],
      [],
      tableInterval,
      threshold,
      earliestMs,
      latestMs,
      dateFormatTz,
      ANOMALIES_TABLE_DEFAULT_QUERY_SIZE,
      undefined,
      undefined,
      functionDescription
    )
    .pipe(
      map((resp) => {
        const anomalies = resp.anomalies;
        enrichAnomalies(anomalies, enrichment);
        return {
          tableData: {
            anomalies,
            interval: resp.interval,
            examplesByJobId: resp.examplesByJobId,
            showViewSeriesLink: false,
          },
        };
      })
    );
}
