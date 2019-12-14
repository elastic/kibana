/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * utils for Anomaly Explorer.
 */

import { chain, each, get, union, uniq } from 'lodash';

import { getEntityFieldList } from '../../common/util/anomaly_utils';
import { isSourceDataChartableForDetector, isModelPlotEnabled } from '../../common/util/job_utils';
import { parseInterval } from '../../common/util/parse_interval';
import { ml } from '../services/ml_api_service';
import { mlJobService } from '../services/job_service';
import { mlResultsService } from 'plugins/ml/services/results_service';

import {
  MAX_CATEGORY_EXAMPLES,
  MAX_INFLUENCER_FIELD_VALUES,
  SWIMLANE_TYPE,
  VIEW_BY_JOB_LABEL,
} from './explorer_constants';
import {
  ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
  ANOMALIES_TABLE_DEFAULT_QUERY_SIZE,
} from '../../common/constants/search';

import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
const mlAnnotationsEnabled = chrome.getInjected('mlAnnotationsEnabled', false);

// create new job objects based on standard job config objects
// new job objects just contain job id, bucket span in seconds and a selected flag.
export function createJobs(jobs) {
  return jobs.map(job => {
    const bucketSpan = parseInterval(job.analysis_config.bucket_span);
    return { id: job.job_id, selected: false, bucketSpanSeconds: bucketSpan.asSeconds() };
  });
}

export function getClearedSelectedAnomaliesState() {
  return {
    anomalyChartRecords: [],
    selectedCells: null,
    viewByLoadedForTimeFormatted: null,
  };
}

export function getDefaultViewBySwimlaneData() {
  return {
    fieldName: '',
    laneLabels: [],
    points: [],
    interval: 3600,
  };
}

export async function getFilteredTopInfluencers(
  jobIds,
  earliestMs,
  latestMs,
  records,
  influencers,
  noInfluencersConfigured,
  influencersFilterQuery
) {
  // Filter the Top Influencers list to show just the influencers from
  // the records in the selected time range.
  const recordInfluencersByName = {};

  // Add the specified influencer(s) to ensure they are used in the filter
  // even if their influencer score for the selected time range is zero.
  influencers.forEach(influencer => {
    const fieldName = influencer.fieldName;
    if (recordInfluencersByName[influencer.fieldName] === undefined) {
      recordInfluencersByName[influencer.fieldName] = [];
    }
    recordInfluencersByName[fieldName].push(influencer.fieldValue);
  });

  // Add the influencers from the top scoring anomalies.
  records.forEach(record => {
    const influencersByName = record.influencers || [];
    influencersByName.forEach(influencer => {
      const fieldName = influencer.influencer_field_name;
      const fieldValues = influencer.influencer_field_values;
      if (recordInfluencersByName[fieldName] === undefined) {
        recordInfluencersByName[fieldName] = [];
      }
      recordInfluencersByName[fieldName].push(...fieldValues);
    });
  });

  const uniqValuesByName = {};
  Object.keys(recordInfluencersByName).forEach(fieldName => {
    const fieldValues = recordInfluencersByName[fieldName];
    uniqValuesByName[fieldName] = uniq(fieldValues);
  });

  const filterInfluencers = [];
  Object.keys(uniqValuesByName).forEach(fieldName => {
    // Find record influencers with the same field name as the clicked on cell(s).
    const matchingFieldName = influencers.find(influencer => {
      return influencer.fieldName === fieldName;
    });

    if (matchingFieldName !== undefined) {
      // Filter for the value(s) of the clicked on cell(s).
      filterInfluencers.push(...influencers);
    } else {
      // For other field names, add values from all records.
      uniqValuesByName[fieldName].forEach(fieldValue => {
        filterInfluencers.push({ fieldName, fieldValue });
      });
    }
  });

  return await loadTopInfluencers(
    jobIds,
    earliestMs,
    latestMs,
    filterInfluencers,
    noInfluencersConfigured,
    influencersFilterQuery
  );
}

export function getInfluencers(selectedJobs = []) {
  const influencers = [];
  selectedJobs.forEach(selectedJob => {
    const job = mlJobService.getJob(selectedJob.id);
    if (job !== undefined && job.analysis_config && job.analysis_config.influencers) {
      influencers.push(...job.analysis_config.influencers);
    }
  });
  return influencers;
}

export function getFieldsByJob() {
  return mlJobService.jobs.reduce(
    (reducedFieldsByJob, job) => {
      // Add the list of distinct by, over, partition and influencer fields for each job.
      const analysisConfig = job.analysis_config;
      const influencers = analysisConfig.influencers || [];
      const fieldsForJob = (analysisConfig.detectors || [])
        .reduce((reducedfieldsForJob, detector) => {
          if (detector.partition_field_name !== undefined) {
            reducedfieldsForJob.push(detector.partition_field_name);
          }
          if (detector.over_field_name !== undefined) {
            reducedfieldsForJob.push(detector.over_field_name);
          }
          // For jobs with by and over fields, don't add the 'by' field as this
          // field will only be added to the top-level fields for record type results
          // if it also an influencer over the bucket.
          if (detector.by_field_name !== undefined && detector.over_field_name === undefined) {
            reducedfieldsForJob.push(detector.by_field_name);
          }
          return reducedfieldsForJob;
        }, [])
        .concat(influencers);

      reducedFieldsByJob[job.job_id] = uniq(fieldsForJob);
      reducedFieldsByJob['*'] = union(reducedFieldsByJob['*'], reducedFieldsByJob[job.job_id]);
      return reducedFieldsByJob;
    },
    { '*': [] }
  );
}

export function getSelectionTimeRange(selectedCells, interval, bounds) {
  // Returns the time range of the cell(s) currently selected in the swimlane.
  // If no cell(s) are currently selected, returns the dashboard time range.
  let earliestMs = bounds.min.valueOf();
  let latestMs = bounds.max.valueOf();

  if (selectedCells !== null && selectedCells.times !== undefined) {
    // time property of the cell data is an array, with the elements being
    // the start times of the first and last cell selected.
    earliestMs =
      selectedCells.times[0] !== undefined ? selectedCells.times[0] * 1000 : bounds.min.valueOf();
    latestMs = bounds.max.valueOf();
    if (selectedCells.times[1] !== undefined) {
      // Subtract 1 ms so search does not include start of next bucket.
      latestMs = (selectedCells.times[1] + interval) * 1000 - 1;
    }
  }

  return { earliestMs, latestMs };
}

export function getSelectionInfluencers(selectedCells, fieldName) {
  if (
    selectedCells !== null &&
    selectedCells.type !== SWIMLANE_TYPE.OVERALL &&
    selectedCells.viewByFieldName !== undefined &&
    selectedCells.viewByFieldName !== VIEW_BY_JOB_LABEL
  ) {
    return selectedCells.lanes.map(laneLabel => ({ fieldName, fieldValue: laneLabel }));
  }

  return [];
}

// Obtain the list of 'View by' fields per job and swimlaneViewByFieldName
export function getViewBySwimlaneOptions({
  currentSwimlaneViewByFieldName,
  filterActive,
  filteredFields,
  isAndOperator,
  selectedCells,
  selectedJobs,
}) {
  const selectedJobIds = selectedJobs.map(d => d.id);

  // Unique influencers for the selected job(s).
  const viewByOptions = chain(
    mlJobService.jobs.reduce((reducedViewByOptions, job) => {
      if (selectedJobIds.some(jobId => jobId === job.job_id)) {
        return reducedViewByOptions.concat(job.analysis_config.influencers || []);
      }
      return reducedViewByOptions;
    }, [])
  )
    .uniq()
    .sortBy(fieldName => fieldName.toLowerCase())
    .value();

  viewByOptions.push(VIEW_BY_JOB_LABEL);
  let viewBySwimlaneOptions = viewByOptions;

  let swimlaneViewByFieldName = undefined;

  if (viewBySwimlaneOptions.indexOf(currentSwimlaneViewByFieldName) !== -1) {
    // Set the swimlane viewBy to that stored in the state (URL) if set.
    // This means we reset it to the current state because it was set by the listener
    // on initialization.
    swimlaneViewByFieldName = currentSwimlaneViewByFieldName;
  } else {
    if (selectedJobIds.length > 1) {
      // If more than one job selected, default to job ID.
      swimlaneViewByFieldName = VIEW_BY_JOB_LABEL;
    } else {
      // For a single job, default to the first partition, over,
      // by or influencer field of the first selected job.
      const firstSelectedJob = mlJobService.jobs.find(job => {
        return job.job_id === selectedJobIds[0];
      });

      const firstJobInfluencers = firstSelectedJob.analysis_config.influencers || [];
      firstSelectedJob.analysis_config.detectors.forEach(detector => {
        if (
          detector.partition_field_name !== undefined &&
          firstJobInfluencers.indexOf(detector.partition_field_name) !== -1
        ) {
          swimlaneViewByFieldName = detector.partition_field_name;
          return false;
        }

        if (
          detector.over_field_name !== undefined &&
          firstJobInfluencers.indexOf(detector.over_field_name) !== -1
        ) {
          swimlaneViewByFieldName = detector.over_field_name;
          return false;
        }

        // For jobs with by and over fields, don't add the 'by' field as this
        // field will only be added to the top-level fields for record type results
        // if it also an influencer over the bucket.
        if (
          detector.by_field_name !== undefined &&
          detector.over_field_name === undefined &&
          firstJobInfluencers.indexOf(detector.by_field_name) !== -1
        ) {
          swimlaneViewByFieldName = detector.by_field_name;
          return false;
        }
      });

      if (swimlaneViewByFieldName === undefined) {
        if (firstJobInfluencers.length > 0) {
          swimlaneViewByFieldName = firstJobInfluencers[0];
        } else {
          // No influencers for first selected job - set to first available option.
          swimlaneViewByFieldName =
            viewBySwimlaneOptions.length > 0 ? viewBySwimlaneOptions[0] : undefined;
        }
      }
    }
  }

  // filter View by options to relevant filter fields
  // If it's an AND filter only show job Id view by as the rest will have no results
  if (filterActive === true && isAndOperator === true && selectedCells === null) {
    viewBySwimlaneOptions = [VIEW_BY_JOB_LABEL];
  } else if (
    filterActive === true &&
    Array.isArray(viewBySwimlaneOptions) &&
    Array.isArray(filteredFields)
  ) {
    const filteredOptions = viewBySwimlaneOptions.filter(option => {
      return (
        filteredFields.includes(option) ||
        option === VIEW_BY_JOB_LABEL ||
        (selectedCells && selectedCells.viewByFieldName === option)
      );
    });
    // only replace viewBySwimlaneOptions with filteredOptions if we found a relevant matching field
    if (filteredOptions.length > 1) {
      viewBySwimlaneOptions = filteredOptions;
    }
  }

  return {
    swimlaneViewByFieldName,
    viewBySwimlaneOptions,
  };
}

export function processOverallResults(scoresByTime, searchBounds, interval) {
  const overallLabel = i18n.translate('xpack.ml.explorer.overallLabel', {
    defaultMessage: 'Overall',
  });
  const dataset = {
    laneLabels: [overallLabel],
    points: [],
    interval,
    earliest: searchBounds.min.valueOf() / 1000,
    latest: searchBounds.max.valueOf() / 1000,
  };

  if (Object.keys(scoresByTime).length > 0) {
    // Store the earliest and latest times of the data returned by the ES aggregations,
    // These will be used for calculating the earliest and latest times for the swimlane charts.
    each(scoresByTime, (score, timeMs) => {
      const time = timeMs / 1000;
      dataset.points.push({
        laneLabel: overallLabel,
        time,
        value: score,
      });

      dataset.earliest = Math.min(time, dataset.earliest);
      dataset.latest = Math.max(time + dataset.interval, dataset.latest);
    });
  }

  return dataset;
}

export function processViewByResults(
  scoresByInfluencerAndTime,
  sortedLaneValues,
  overallSwimlaneData,
  swimlaneViewByFieldName,
  interval
) {
  // Processes the scores for the 'view by' swimlane.
  // Sorts the lanes according to the supplied array of lane
  // values in the order in which they should be displayed,
  // or pass an empty array to sort lanes according to max score over all time.
  const dataset = {
    fieldName: swimlaneViewByFieldName,
    points: [],
    interval,
  };

  // Set the earliest and latest to be the same as the overall swimlane.
  dataset.earliest = overallSwimlaneData.earliest;
  dataset.latest = overallSwimlaneData.latest;

  const laneLabels = [];
  const maxScoreByLaneLabel = {};

  each(scoresByInfluencerAndTime, (influencerData, influencerFieldValue) => {
    laneLabels.push(influencerFieldValue);
    maxScoreByLaneLabel[influencerFieldValue] = 0;

    each(influencerData, (anomalyScore, timeMs) => {
      const time = timeMs / 1000;
      dataset.points.push({
        laneLabel: influencerFieldValue,
        time,
        value: anomalyScore,
      });
      maxScoreByLaneLabel[influencerFieldValue] = Math.max(
        maxScoreByLaneLabel[influencerFieldValue],
        anomalyScore
      );
    });
  });

  const sortValuesLength = sortedLaneValues.length;
  if (sortValuesLength === 0) {
    // Sort lanes in descending order of max score.
    // Note the keys in scoresByInfluencerAndTime received from the ES request
    // are not guaranteed to be sorted by score if they can be parsed as numbers
    // (e.g. if viewing by HTTP response code).
    dataset.laneLabels = laneLabels.sort((a, b) => {
      return maxScoreByLaneLabel[b] - maxScoreByLaneLabel[a];
    });
  } else {
    // Sort lanes according to supplied order
    // e.g. when a cell in the overall swimlane has been selected.
    // Find the index of each lane label from the actual data set,
    // rather than using sortedLaneValues as-is, just in case they differ.
    dataset.laneLabels = laneLabels.sort((a, b) => {
      let aIndex = sortedLaneValues.indexOf(a);
      let bIndex = sortedLaneValues.indexOf(b);
      aIndex = aIndex > -1 ? aIndex : sortValuesLength;
      bIndex = bIndex > -1 ? bIndex : sortValuesLength;
      return aIndex - bIndex;
    });
  }

  return dataset;
}

export function loadAnnotationsTableData(selectedCells, selectedJobs, interval, bounds) {
  const jobIds =
    selectedCells !== null && selectedCells.viewByFieldName === VIEW_BY_JOB_LABEL
      ? selectedCells.lanes
      : selectedJobs.map(d => d.id);
  const timeRange = getSelectionTimeRange(selectedCells, interval, bounds);

  if (mlAnnotationsEnabled === false) {
    return Promise.resolve([]);
  }

  return new Promise(resolve => {
    ml.annotations
      .getAnnotations({
        jobIds,
        earliestMs: timeRange.earliestMs,
        latestMs: timeRange.latestMs,
        maxAnnotations: ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
      })
      .then(resp => {
        if (resp.error !== undefined || resp.annotations === undefined) {
          return resolve([]);
        }

        const annotationsData = [];
        jobIds.forEach(jobId => {
          const jobAnnotations = resp.annotations[jobId];
          if (jobAnnotations !== undefined) {
            annotationsData.push(...jobAnnotations);
          }
        });

        return resolve(
          annotationsData
            .sort((a, b) => {
              return a.timestamp - b.timestamp;
            })
            .map((d, i) => {
              d.key = String.fromCharCode(65 + i);
              return d;
            })
        );
      })
      .catch(resp => {
        console.log('Error loading list of annotations for jobs list:', resp);
        // Silently fail and just return an empty array for annotations to not break the UI.
        return resolve([]);
      });
  });
}

export async function loadAnomaliesTableData(
  selectedCells,
  selectedJobs,
  dateFormatTz,
  interval,
  bounds,
  fieldName,
  tableInterval,
  tableSeverity,
  influencersFilterQuery
) {
  const jobIds =
    selectedCells !== null && selectedCells.viewByFieldName === VIEW_BY_JOB_LABEL
      ? selectedCells.lanes
      : selectedJobs.map(d => d.id);
  const influencers = getSelectionInfluencers(selectedCells, fieldName);
  const timeRange = getSelectionTimeRange(selectedCells, interval, bounds);

  return new Promise((resolve, reject) => {
    ml.results
      .getAnomaliesTableData(
        jobIds,
        [],
        influencers,
        tableInterval,
        tableSeverity,
        timeRange.earliestMs,
        timeRange.latestMs,
        dateFormatTz,
        ANOMALIES_TABLE_DEFAULT_QUERY_SIZE,
        MAX_CATEGORY_EXAMPLES,
        influencersFilterQuery
      )
      .then(resp => {
        const anomalies = resp.anomalies;
        const detectorsByJob = mlJobService.detectorsByJob;
        anomalies.forEach(anomaly => {
          // Add a detector property to each anomaly.
          // Default to functionDescription if no description available.
          // TODO - when job_service is moved server_side, move this to server endpoint.
          const jobId = anomaly.jobId;
          const detector = get(detectorsByJob, [jobId, anomaly.detectorIndex]);
          anomaly.detector = get(
            detector,
            ['detector_description'],
            anomaly.source.function_description
          );

          // For detectors with rules, add a property with the rule count.
          if (detector !== undefined && detector.custom_rules !== undefined) {
            anomaly.rulesLength = detector.custom_rules.length;
          }

          // Add properties used for building the links menu.
          // TODO - when job_service is moved server_side, move this to server endpoint.
          const job = mlJobService.getJob(jobId);
          let isChartable = isSourceDataChartableForDetector(job, anomaly.detectorIndex);
          if (isChartable === false) {
            // Check if model plot is enabled for this job.
            // Need to check the entity fields for the record in case the model plot config has a terms list.
            // If terms is specified, model plot is only stored if both the partition and by fields appear in the list.
            const entityFields = getEntityFieldList(anomaly.source);
            isChartable = isModelPlotEnabled(job, anomaly.detectorIndex, entityFields);
          }
          anomaly.isTimeSeriesViewRecord = isChartable;

          if (mlJobService.customUrlsByJob[jobId] !== undefined) {
            anomaly.customUrls = mlJobService.customUrlsByJob[jobId];
          }
        });

        resolve({
          anomalies,
          interval: resp.interval,
          examplesByJobId: resp.examplesByJobId,
          showViewSeriesLink: true,
          jobIds,
        });
      })
      .catch(resp => {
        console.log('Explorer - error loading data for anomalies table:', resp);
        reject();
      });
  });
}

// track the request to be able to ignore out of date requests
// and avoid race conditions ending up with the wrong charts.
let requestCount = 0;
export async function loadDataForCharts(
  jobIds,
  earliestMs,
  latestMs,
  influencers = [],
  selectedCells,
  influencersFilterQuery
) {
  return new Promise(resolve => {
    // Just skip doing the request when this function
    // is called without the minimum required data.
    if (
      selectedCells === null &&
      influencers.length === 0 &&
      influencersFilterQuery === undefined
    ) {
      resolve([]);
    }

    const newRequestCount = ++requestCount;
    requestCount = newRequestCount;

    // Load the top anomalies (by record_score) which will be displayed in the charts.
    mlResultsService
      .getRecordsForInfluencer(
        jobIds,
        influencers,
        0,
        earliestMs,
        latestMs,
        500,
        influencersFilterQuery
      )
      .then(resp => {
        // Ignore this response if it's returned by an out of date promise
        if (newRequestCount < requestCount) {
          resolve(undefined);
        }

        if (
          (selectedCells !== null && Object.keys(selectedCells).length > 0) ||
          influencersFilterQuery !== undefined
        ) {
          console.log('Explorer anomaly charts data set:', resp.records);
          resolve(resp.records);
        }

        resolve(undefined);
      });
  });
}

export async function loadTopInfluencers(
  selectedJobIds,
  earliestMs,
  latestMs,
  influencers = [],
  noInfluencersConfigured,
  influencersFilterQuery
) {
  return new Promise(resolve => {
    if (noInfluencersConfigured !== true) {
      mlResultsService
        .getTopInfluencers(
          selectedJobIds,
          earliestMs,
          latestMs,
          MAX_INFLUENCER_FIELD_VALUES,
          influencers,
          influencersFilterQuery
        )
        .then(resp => {
          // TODO - sort the influencers keys so that the partition field(s) are first.
          console.log('Explorer top influencers data set:', resp.influencers);
          resolve(resp.influencers);
        });
    } else {
      resolve({});
    }
  });
}
