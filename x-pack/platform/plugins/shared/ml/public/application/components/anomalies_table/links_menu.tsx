/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import moment from 'moment';
import rison from '@kbn/rison';
import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';

import {
  useEuiTheme,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiProgress,
  EuiToolTip,
} from '@elastic/eui';

import type { SerializableRecord } from '@kbn/utility-types';
import { APP_ID as MAPS_APP_ID } from '@kbn/maps-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { MAPS_APP_LOCATOR } from '@kbn/maps-plugin/public';
import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import {
  isCategorizationAnomaly,
  isRuleSupported,
  type MlCustomUrlAnomalyRecordDoc,
  type MlKibanaUrlConfig,
  type MlAnomaliesTableRecord,
  MLCATEGORY,
} from '@kbn/ml-anomaly-utils';
import { formatHumanReadableDateTimeSeconds, timeFormatter } from '@kbn/ml-date-utils';
import { SEARCH_QUERY_LANGUAGE } from '@kbn/ml-query-utils';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { isDefined } from '@kbn/ml-is-defined';
import { escapeQuotes } from '@kbn/es-query';
import { isQuery } from '@kbn/data-plugin/public';

import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import { parseInterval } from '@kbn/ml-parse-interval';
import { CATEGORIZE_FIELD_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { PLUGIN_ID } from '../../../../common/constants/app';
import { findMessageField } from '../../util/index_utils';
import { getInitialAnomaliesLayers, getInitialSourceIndexFieldLayers } from '../../../maps/util';
import { ML_APP_LOCATOR, ML_PAGES } from '../../../../common/constants/locator';
import { getFiltersForDSLQuery } from '../../../../common/util/job_utils';

import { useMlJobService } from '../../services/job_service';
import { escapeKueryForFieldValuePair, replaceStringTokens } from '../../util/string_utils';
import { getUrlForRecord, openCustomUrlWindow } from '../../util/custom_url_utils';
import type { SourceIndicesWithGeoFields } from '../../explorer/explorer_utils';
import { escapeDoubleQuotes, getDateFormatTz } from '../../explorer/explorer_utils';
import { usePermissionCheck } from '../../capabilities/check_capabilities';
import { useMlApi, useMlKibana } from '../../contexts/kibana';
import { useMlIndexUtils } from '../../util/index_service';

import { getQueryStringForInfluencers } from './get_query_string_for_influencers';
import type { FocusTrapProps } from '../../util/create_focus_trap_props';
import { createFocusTrapProps } from '../../util/create_focus_trap_props';

const LOG_RATE_ANALYSIS_MARGIN_FACTOR = 20;
const LOG_RATE_ANALYSIS_BASELINE_FACTOR = 15;

interface LinksMenuProps {
  anomaly: MlAnomaliesTableRecord;
  bounds: TimeRangeBounds;
  showMapsLink: boolean;
  showViewSeriesLink: boolean;
  isAggregatedData: boolean;
  interval: 'day' | 'hour' | 'second';
  showRuleEditorFlyout: (anomaly: MlAnomaliesTableRecord, focusTrapProps: FocusTrapProps) => void;
  onItemClick: () => void;
  sourceIndicesWithGeoFields: SourceIndicesWithGeoFields;
  selectedJob?: MlJob;
  showAnomalyAlertFlyout?: (anomaly: MlAnomaliesTableRecord) => void;
}

export const LinksMenuUI = (props: LinksMenuProps) => {
  const { euiTheme } = useEuiTheme();
  const isMounted = useMountedState();

  const [dataViewId, setDataViewId] = useState<string | null>(null);
  const [dataViewIdWithTemporary, setDataViewIdWithTemporary] = useState<string | null>(null);
  const [openInDiscoverUrl, setOpenInDiscoverUrl] = useState<string | undefined>();
  const [openInDiscoverUrlError, setOpenInDiscoverUrlError] = useState<string | undefined>();
  const [viewExamplesUrlError, setViewExamplesUrlError] = useState<string | undefined>();
  const [openInLogRateAnalysisUrl, setOpenInLogRateAnalysisUrl] = useState<string | undefined>();

  const [messageField, setMessageField] = useState<{
    dataView: DataView;
    field: DataViewField;
  } | null>(null);

  const isCategorizationAnomalyRecord = isCategorizationAnomaly(props.anomaly);

  const closePopover = props.onItemClick;
  const focusTrapProps = useMemo(() => {
    const triggerElement = document.getElementById(
      `mlAnomaliesListRowActionsButton-${props.anomaly.rowId}`
    );
    return createFocusTrapProps(triggerElement);
  }, [props.anomaly.rowId]);

  const kibana = useMlKibana();
  const {
    services: {
      data,
      share,
      application,
      uiActions,
      uiSettings,
      notifications: { toasts },
    },
  } = kibana;
  const { getDataViewById, getDataViewIdFromName } = useMlIndexUtils();
  const mlApi = useMlApi();
  const mlJobService = useMlJobService();

  const job = useMemo(() => {
    if (props.selectedJob !== undefined) return props.selectedJob;
    return mlJobService.getJob(props.anomaly.jobId);
    // skip mlJobService from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.anomaly.jobId, props.selectedJob]);

  const categorizationFieldName = job.analysis_config.categorization_field_name;
  const datafeedIndices = job.datafeed_config!.indices;
  const indexPattern = datafeedIndices.join(',');
  const autoGeneratedDiscoverLinkError = i18n.translate(
    'xpack.ml.anomaliesTable.linksMenu.autoGeneratedDiscoverLinkErrorMessage',
    {
      defaultMessage: `Unable to link to Discover; no data view exists for index pattern ''{index}''`,
      values: { index: indexPattern },
    }
  );

  useEffect(
    () => {
      async function initDataViewId() {
        const newDataViewId = await getDataViewIdFromName(indexPattern);
        setDataViewId(newDataViewId);
        if (newDataViewId === null) {
          setViewExamplesUrlError(autoGeneratedDiscoverLinkError);
        }

        const newDataViewIdWithTemporary = await getDataViewIdFromName(indexPattern, job);
        setDataViewIdWithTemporary(newDataViewIdWithTemporary);
        if (newDataViewIdWithTemporary === null) {
          setOpenInDiscoverUrlError(autoGeneratedDiscoverLinkError);
        }
      }

      initDataViewId();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const getAnomaliesMapsLink = async (anomaly: MlAnomaliesTableRecord) => {
    const initialLayers = getInitialAnomaliesLayers(anomaly.jobId, euiTheme);
    const anomalyBucketStartMoment = moment(anomaly.source.timestamp).tz(
      getDateFormatTz(uiSettings)
    );
    const anomalyBucketStart = anomalyBucketStartMoment.toISOString();
    const anomalyBucketEnd = anomalyBucketStartMoment
      .add(anomaly.source.bucket_span, 'seconds')
      .subtract(1, 'ms')
      .toISOString();
    const timeRange = data.query.timefilter.timefilter.getTime();

    // Set 'from' in timeRange to start bucket time for the specific anomaly
    timeRange.from = anomalyBucketStart;
    timeRange.to = anomalyBucketEnd;

    const locator = share.url.locators.get(MAPS_APP_LOCATOR);
    const location = await locator?.getLocation({
      initialLayers,
      timeRange,
      ...(anomaly.entityName && anomaly.entityValue
        ? {
            query: {
              language: SEARCH_QUERY_LANGUAGE.KUERY,
              query: escapeKueryForFieldValuePair(anomaly.entityName, anomaly.entityValue),
            },
          }
        : {}),
      filters:
        dataViewId === null
          ? []
          : getFiltersForDSLQuery(job.datafeed_config!.query, dataViewId, job.job_id),
    });
    return location;
  };

  const getAnomalySourceMapsLink = async (
    anomaly: MlAnomaliesTableRecord,
    sourceIndicesWithGeoFields: SourceIndicesWithGeoFields
  ) => {
    // Create a layer for each of the geoFields
    const initialLayers = getInitialSourceIndexFieldLayers(
      sourceIndicesWithGeoFields[anomaly.jobId],
      euiTheme
    );
    // Widen the timerange by one bucket span on start/end to increase chances of always having data on the map
    const anomalyBucketStartMoment = moment(anomaly.source.timestamp).tz(
      getDateFormatTz(uiSettings)
    );
    const anomalyBucketStart = anomalyBucketStartMoment
      .subtract(anomaly.source.bucket_span, 'seconds')
      .toISOString();
    const anomalyBucketEnd = anomalyBucketStartMoment
      .add(anomaly.source.bucket_span * 3, 'seconds')
      .subtract(1, 'ms')
      .toISOString();
    const timeRange = data.query.timefilter.timefilter.getTime();

    // Set 'from' in timeRange to start bucket time for the specific anomaly
    timeRange.from = anomalyBucketStart;
    timeRange.to = anomalyBucketEnd;

    // Create query string for influencers
    const influencersQueryString = getQueryStringForInfluencers(
      anomaly.influencers,
      anomaly.entityName
    );

    const locator = share.url.locators.get(MAPS_APP_LOCATOR);
    const filtersFromDatafeedQuery =
      dataViewId === null
        ? []
        : getFiltersForDSLQuery(job.datafeed_config!.query, dataViewId, job.job_id);
    const location = await locator?.getLocation({
      initialLayers,
      timeRange,
      filters:
        filtersFromDatafeedQuery.length > 0
          ? filtersFromDatafeedQuery
          : data.query.filterManager.getFilters(),
      ...(anomaly.entityName && anomaly.entityValue
        ? {
            query: {
              language: SEARCH_QUERY_LANGUAGE.KUERY,
              query: `${escapeKueryForFieldValuePair(anomaly.entityName, anomaly.entityValue)}${
                influencersQueryString !== '' ? ` and (${influencersQueryString})` : ''
              }`,
            },
          }
        : {}),
    });
    return location;
  };

  useEffect(() => {
    const discoverLocator = share.url.locators.get('DISCOVER_APP_LOCATOR');

    if (dataViewIdWithTemporary === null) return;

    if (!discoverLocator) {
      const discoverLocatorMissing = i18n.translate(
        'xpack.ml.anomaliesTable.linksMenu.discoverLocatorMissingErrorMessage',
        {
          defaultMessage: 'No locator for Discover detected',
        }
      );

      if (isMounted()) {
        setOpenInDiscoverUrlError(discoverLocatorMissing);
        setViewExamplesUrlError(discoverLocatorMissing);
      }
      return;
    }

    (async () => {
      const dataView = dataViewId ? await getDataViewById(dataViewId) : null;

      if (dataView === null) {
        return;
      }
      dataView.getIndexPattern();
      const field = findMessageField(dataView);
      if (field !== null) {
        setMessageField(field);
      }
    })();

    // withWindowParameters is used to generate the url state
    // for Log Rate Analysis to create a baseline and deviation
    // selection based on the anomaly record timestamp and bucket span.
    const generateRedirectUrlPageState = async (
      withWindowParameters = false,
      timeAttribute = 'timeRange'
    ): Promise<SerializableRecord> => {
      const interval = props.interval;

      const record = props.anomaly.source;

      // Use the exact timestamp for Log Rate Analysis,
      // in all other cases snap it to the provided interval.
      const earliestMoment = withWindowParameters
        ? moment(record.timestamp)
        : moment(record.timestamp).startOf(interval);

      // For Log Rate Analysis, look back further to
      // provide enough room for the baseline time range.
      // In all other cases look back 1 hour.
      if (withWindowParameters) {
        earliestMoment.subtract(record.bucket_span * LOG_RATE_ANALYSIS_MARGIN_FACTOR, 's');
      } else if (interval === 'hour') {
        // Start from the previous hour.
        earliestMoment.subtract(1, 'h');
      }

      const latestMoment = moment(record.timestamp).add(record.bucket_span, 's');

      if (withWindowParameters) {
        latestMoment.add(record.bucket_span * LOG_RATE_ANALYSIS_MARGIN_FACTOR, 's');
      } else if (props.isAggregatedData === true) {
        if (interval === 'hour') {
          // Show to the end of the next hour.
          latestMoment.add(1, 'h');
        }
        latestMoment.subtract(1, 'ms').endOf(interval); // e.g. 2016-02-08T18:59:59.999Z
      }

      const from = timeFormatter(earliestMoment.unix() * 1000); // e.g. 2016-02-08T16:00:00.000Z
      const to = timeFormatter(latestMoment.unix() * 1000); // e.g. 2016-02-08T18:59:59.000Z

      // The window parameters for Log Rate Analysis.
      // The deviation time range will span the current anomaly's bucket.
      const dMin = record.timestamp;
      const dMax = record.timestamp + record.bucket_span * 1000;
      const bMax = dMin - record.bucket_span * 1000;
      const bMin = bMax - record.bucket_span * 1000 * LOG_RATE_ANALYSIS_BASELINE_FACTOR;

      let kqlQuery = '';

      if (record.influencers && !withWindowParameters) {
        kqlQuery = record.influencers
          .filter((influencer) => isDefined(influencer))
          .map((influencer) => {
            const values = influencer.influencer_field_values;

            if (values.length > 0) {
              const fieldName = escapeQuotes(influencer.influencer_field_name);
              const escapedVals = values
                .filter((value) => isDefined(value))
                .map((value) => `"${fieldName}":"${escapeQuotes(value)}"`);
              // Ensure there's enclosing () if there are multiple field values,
              return escapedVals.length > 1 ? `(${escapedVals.join(' OR ')})` : escapedVals[0];
            }
          })
          .join(' AND ');
      }

      // For multi-metric or population jobs, we add the selected entity for links to
      // Log Rate Analysis, so they can be restored as part of the search filter.
      if (withWindowParameters && props.anomaly.entityName && props.anomaly.entityValue) {
        if (kqlQuery !== '') {
          kqlQuery += ' AND ';
        }

        kqlQuery = `"${escapeQuotes(props.anomaly.entityName)}":"${escapeQuotes(
          props.anomaly.entityValue + ''
        )}"`;
      }

      const indexPatternId = dataViewIdWithTemporary;

      return {
        indexPatternId,
        [timeAttribute]: {
          from,
          to,
          mode: 'absolute',
        },
        query: {
          language: 'kuery',
          query: kqlQuery,
        },
        filters:
          indexPatternId === null
            ? []
            : getFiltersForDSLQuery(job.datafeed_config!.query, indexPatternId, job.job_id),
        ...(withWindowParameters
          ? {
              wp: { bMin, bMax, dMin, dMax },
            }
          : {}),
      };
    };

    const generateDiscoverUrl = async () => {
      const pageState = await generateRedirectUrlPageState();
      const url = await discoverLocator.getRedirectUrl(pageState);

      if (isMounted()) {
        setOpenInDiscoverUrl(url);
      }
    };

    const generateLogRateAnalysisUrl = async () => {
      if (
        props.anomaly.source.function_description !== 'count' ||
        // Disable link for datafeeds that use aggregations
        // and define a non-standard summary count field name
        (job.analysis_config.summary_count_field_name !== undefined &&
          job.analysis_config.summary_count_field_name !== 'doc_count')
      ) {
        if (isMounted()) {
          setOpenInLogRateAnalysisUrl(undefined);
        }
        return;
      }

      const mlLocator = share.url.locators.get(ML_APP_LOCATOR);

      if (!mlLocator) {
        // eslint-disable-next-line no-console
        console.error('Unable to detect locator for ML or bounds');
        return;
      }
      const pageState = await generateRedirectUrlPageState(true, 'time');

      const { indexPatternId, wp, query, filters, ...globalState } = pageState;

      const url = await mlLocator.getRedirectUrl({
        page: ML_PAGES.AIOPS_LOG_RATE_ANALYSIS,
        pageState: {
          index: indexPatternId,
          globalState,
          appState: {
            logRateAnalysis: {
              wp,
              ...(isQuery(query)
                ? {
                    filters,
                    searchString: query.query,
                    searchQueryLanguage: query.language,
                  }
                : {}),
            },
          },
        },
      });

      if (isMounted()) {
        setOpenInLogRateAnalysisUrl(url);
      }
    };

    if (!isCategorizationAnomalyRecord) {
      generateDiscoverUrl();
      generateLogRateAnalysisUrl();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViewId, dataViewIdWithTemporary, JSON.stringify(props.anomaly)]);

  const openCustomUrl = (customUrl: MlKibanaUrlConfig) => {
    const { anomaly, interval, isAggregatedData } = props;

    // eslint-disable-next-line no-console
    console.log('Anomalies Table - open customUrl for record:', anomaly);

    // If url_value contains $earliest$ and $latest$ tokens, add in times to the source record.
    // Create a copy of the record as we are adding properties into it.
    const record = cloneDeep(anomaly.source) as MlCustomUrlAnomalyRecordDoc;
    const timestamp = record.timestamp;
    const configuredUrlValue = customUrl.url_value;
    const timeRangeInterval =
      customUrl.time_range !== undefined ? parseInterval(customUrl.time_range) : null;
    const basePath = kibana.services.http.basePath.get();

    if (configuredUrlValue.includes('$earliest$')) {
      let earliestMoment = moment(timestamp);
      if (timeRangeInterval !== null) {
        earliestMoment.subtract(timeRangeInterval);
      } else {
        earliestMoment = moment(timestamp).startOf(interval);
        if (interval === 'hour') {
          // Start from the previous hour.
          earliestMoment.subtract(1, 'h');
        }
      }
      record.earliest = earliestMoment.toISOString(); // e.g. 2016-02-08T16:00:00.000Z
    }

    if (configuredUrlValue.includes('$latest$')) {
      const latestMoment = moment(timestamp).add(record.bucket_span, 's');
      if (timeRangeInterval !== null) {
        latestMoment.add(timeRangeInterval);
      } else {
        if (isAggregatedData === true) {
          if (interval === 'hour') {
            // Show to the end of the next hour.
            latestMoment.add(1, 'h'); // e.g. 2016-02-08T18:59:59.999Z
          }
          latestMoment.subtract(1, 'ms').endOf(interval); // e.g. 2016-02-08T18:59:59.999Z
        }
      }
      record.latest = latestMoment.toISOString();
    }

    // If url_value contains $mlcategoryterms$ or $mlcategoryregex$, add in the
    // terms and regex for the selected categoryId to the source record.
    if (
      (configuredUrlValue.includes('$mlcategoryterms$') ||
        configuredUrlValue.includes('$mlcategoryregex$')) &&
      record.mlcategory !== undefined
    ) {
      const jobId = record.job_id;

      // mlcategory in the source record will be an array
      // - use first value (will only ever be more than one if influenced by category other than by/partition/over).
      const categoryId = record.mlcategory[0];

      mlApi.results
        .getCategoryDefinition(jobId, categoryId)
        .then((resp) => {
          // Prefix each of the terms with '+' so that the Elasticsearch Query String query
          // run in a drilldown Kibana dashboard has to match on all terms.
          const termsArray = resp.terms.split(' ').map((term: string) => `+${term}`);
          record.mlcategoryterms = termsArray.join(' ');
          record.mlcategoryregex = resp.regex;

          // Replace any tokens in the configured url_value with values from the source record,
          // and then open link in a new tab/window.
          const urlPath = replaceStringTokens(customUrl.url_value, record, true);
          openCustomUrlWindow(urlPath, customUrl, basePath);
        })
        .catch((resp) => {
          // eslint-disable-next-line no-console
          console.log('openCustomUrl(): error loading categoryDefinition:', resp);
          toasts.addDanger(
            i18n.translate('xpack.ml.anomaliesTable.linksMenu.unableToOpenLinkErrorMessage', {
              defaultMessage:
                'Unable to open link as an error occurred loading details on category ID {categoryId}',
              values: {
                categoryId,
              },
            })
          );
        });
    } else {
      // Replace any tokens in the configured url_value with values from the source record,
      // and then open link in a new tab/window.
      const urlPath = getUrlForRecord(customUrl, record as MlCustomUrlAnomalyRecordDoc);
      openCustomUrlWindow(urlPath, customUrl, basePath);
    }
  };

  const viewSeries = async () => {
    const mlLocator = share.url.locators.get(ML_APP_LOCATOR);

    const record = props.anomaly.source;
    const bounds = props.bounds;

    if (!mlLocator) {
      // eslint-disable-next-line no-console
      console.error('Unable to detect locator for ML or bounds');
      return;
    }

    if (!bounds || !bounds.min || !bounds.max) {
      // eslint-disable-next-line no-console
      console.error('Invalid bounds');
      return;
    }

    const from = bounds.min.toISOString(); // e.g. 2016-02-08T16:00:00.000Z
    const to = bounds.max.toISOString();

    // Zoom to show 50 buckets either side of the record.
    const recordTime = moment(record.timestamp);
    const zoomFrom = recordTime.subtract(50 * record.bucket_span, 's').toISOString();
    const zoomTo = recordTime.add(100 * record.bucket_span, 's').toISOString();

    // Extract the by, over and partition fields for the record.
    const entityCondition: Record<string, string | number> = {};

    if (record.partition_field_name !== undefined && record.partition_field_value !== undefined) {
      entityCondition[record.partition_field_name] = record.partition_field_value;
    }

    if (record.over_field_name !== undefined && record.over_field_value !== undefined) {
      entityCondition[record.over_field_name] = record.over_field_value;
    }

    if (record.by_field_name !== undefined && record.by_field_value !== undefined) {
      // Note that analyses with by and over fields, will have a top-level by_field_name,
      // but the by_field_value(s) will be in the nested causes array.
      // TODO - drilldown from cause in expanded row only?
      entityCondition[record.by_field_name] = record.by_field_value;
    }

    const singleMetricViewerLink = await mlLocator.getUrl(
      {
        page: ML_PAGES.SINGLE_METRIC_VIEWER,
        pageState: {
          jobIds: [record.job_id],
          refreshInterval: {
            display: 'Off',
            pause: true,
            value: 0,
          },
          timeRange: {
            from,
            to,
            mode: 'absolute',
          },
          zoom: {
            from: zoomFrom,
            to: zoomTo,
          },
          detectorIndex: record.detector_index,
          entities: entityCondition,
          query_string: {
            analyze_wildcard: true,
            query: '*',
          },
        },
      },
      { absolute: true }
    );
    window.open(singleMetricViewerLink, '_blank');
  };

  const viewExamples = async () => {
    const categoryId = props.anomaly.entityValue;
    const record = props.anomaly.source;

    if (job === undefined) {
      // eslint-disable-next-line no-console
      console.log(`viewExamples(): no job found with ID: ${props.anomaly.jobId}`);
      toasts.addDanger(
        i18n.translate('xpack.ml.anomaliesTable.linksMenu.unableToViewExamplesErrorMessage', {
          defaultMessage: 'Unable to view examples as no details could be found for job ID {jobId}',
          values: {
            jobId: props.anomaly.jobId,
          },
        })
      );
      return;
    }

    if (!categorizationFieldName) {
      return;
    }

    const createAndOpenUrl = (index: string, categorizationFieldType: string) => {
      // Get the definition of the category and use the terms or regex to view the
      // matching events in the Kibana Discover tab depending on whether the
      // categorization field is of mapping type text (preferred) or keyword.
      mlApi.results
        .getCategoryDefinition(record.job_id, categoryId)
        .then(async (resp) => {
          // We should not redirect to Discover if data view doesn't exist
          if (!dataViewId) return;

          let query = null;
          // Build query using categorization regex (if keyword type) or terms (if text type).
          // Check for terms or regex in case categoryId represents an anomaly from the absence of the
          // categorization field in documents (usually indicated by a categoryId of -1).
          if (categorizationFieldType === ES_FIELD_TYPES.KEYWORD) {
            if (resp.regex) {
              query = {
                language: SEARCH_QUERY_LANGUAGE.LUCENE,
                query: `${categorizationFieldName}:/${resp.regex}/`,
              };
            }
          } else {
            if (resp.terms) {
              const escapedTerms = escapeDoubleQuotes(resp.terms);
              query = {
                language: SEARCH_QUERY_LANGUAGE.KUERY,
                query:
                  `${categorizationFieldName}:"` +
                  escapedTerms.split(' ').join(`" and ${categorizationFieldName}:"`) +
                  '"',
              };
            }
          }

          const recordTime = moment(record.timestamp);
          const from = recordTime.toISOString();
          const to = recordTime.add(record.bucket_span, 's').toISOString();

          // Use rison to build the URL .
          const _g = rison.encode({
            refreshInterval: {
              display: 'Off',
              pause: true,
              value: 0,
            },
            time: {
              from,
              to,
              mode: 'absolute',
            },
          });

          const appStateProps = {
            index: dataViewId,
            filters: getFiltersForDSLQuery(job.datafeed_config!.query, dataViewId, job.job_id),
            ...(query !== null
              ? {
                  query,
                }
              : {}),
          };
          const _a = rison.encode(appStateProps);

          // Need to encode the _a parameter as it will contain characters such as '+' if using the regex.
          const { basePath } = kibana.services.http;
          const path = `${basePath.get()}/app/discover#/?_g=${_g}&_a=${encodeURIComponent(_a)}`;
          window.open(path, '_blank');
        })
        .catch((resp) => {
          // eslint-disable-next-line no-console
          console.log('viewExamples(): error loading categoryDefinition:', resp);
          toasts.addDanger(
            i18n.translate('xpack.ml.anomaliesTable.linksMenu.loadingDetailsErrorMessage', {
              defaultMessage:
                'Unable to view examples as an error occurred loading details on category ID {categoryId}',
              values: {
                categoryId,
              },
            })
          );
        });
    };

    // Find the type of the categorization field i.e. text (preferred) or keyword.
    // Uses the first matching field found in the list of indices in the datafeed_config.
    let fieldType;

    const dataView = dataViewIdWithTemporary
      ? await getDataViewById(dataViewIdWithTemporary)
      : null;

    const field = dataView?.getFieldByName(categorizationFieldName);
    if (field && Array.isArray(field.esTypes) && field.esTypes.length > 0) {
      fieldType = field.esTypes[0];
    }

    if (fieldType) {
      createAndOpenUrl(datafeedIndices.join(), fieldType);
    } else {
      // eslint-disable-next-line no-console
      console.log(
        `viewExamples(): error finding type of field ${categorizationFieldName} in indices:`,
        datafeedIndices
      );
      toasts.addDanger(
        i18n.translate('xpack.ml.anomaliesTable.linksMenu.noMappingCouldBeFoundErrorMessage', {
          defaultMessage:
            'Unable to view examples of documents with mlcategory {categoryId} ' +
            'as no mapping could be found for the categorization field {categorizationFieldName}',
          values: {
            categoryId,
            categorizationFieldName,
          },
        })
      );
    }
  };

  const { anomaly, showViewSeriesLink, showAnomalyAlertFlyout } = props;
  const [canUpdateJob, canCreateMlAlerts, canUseAiops] = usePermissionCheck([
    'canUpdateJob',
    'canCreateMlAlerts',
    'canUseAiops',
  ]);
  const canConfigureRules = isRuleSupported(anomaly.source) && canUpdateJob;

  const contextMenuItems = useMemo(() => {
    const items = [];
    if (anomaly.customUrls !== undefined) {
      anomaly.customUrls.forEach((customUrl, index) => {
        items.push(
          <EuiContextMenuItem
            key={`custom_url_${index}`}
            icon="popout"
            onClick={() => {
              closePopover();
              openCustomUrl(customUrl);
            }}
            data-test-subj={`mlAnomaliesListRowActionCustomUrlButton_${index}`}
          >
            {customUrl.url_name}
          </EuiContextMenuItem>
        );
      });
    }

    if (application.capabilities.discover_v2?.show && !isCategorizationAnomalyRecord) {
      // Add item from the start, but disable it during the URL generation.
      const isLoading = openInDiscoverUrlError === undefined && openInDiscoverUrl === undefined;

      items.push(
        <EuiContextMenuItem
          key={`auto_raw_data_url`}
          icon="discoverApp"
          disabled={openInDiscoverUrlError !== undefined || isLoading}
          href={openInDiscoverUrl}
          data-test-subj={`mlAnomaliesListRowAction_viewInDiscoverButton`}
        >
          {openInDiscoverUrlError ? (
            <EuiToolTip content={openInDiscoverUrlError}>
              <FormattedMessage
                id="xpack.ml.anomaliesTable.linksMenu.viewInDiscover"
                defaultMessage="View in Discover"
              />
            </EuiToolTip>
          ) : (
            <FormattedMessage
              id="xpack.ml.anomaliesTable.linksMenu.viewInDiscover"
              defaultMessage="View in Discover"
            />
          )}
          {isLoading ? <EuiProgress size={'xs'} color={'accent'} /> : null}
        </EuiContextMenuItem>
      );
    }
    if (showViewSeriesLink === true) {
      if (anomaly.isTimeSeriesViewRecord) {
        items.push(
          <EuiContextMenuItem
            key="view_series"
            icon="singleMetricViewer"
            onClick={() => {
              closePopover();
              viewSeries();
            }}
            data-test-subj="mlAnomaliesListRowActionViewSeriesButton"
          >
            <FormattedMessage
              id="xpack.ml.anomaliesTable.linksMenu.viewSeriesLabel"
              defaultMessage="View series"
            />
          </EuiContextMenuItem>
        );
      }
    }
    if (application.capabilities.maps_v2?.show) {
      if (anomaly.isGeoRecord === true) {
        items.push(
          <EuiContextMenuItem
            key="view_in_maps"
            icon="gisApp"
            onClick={async () => {
              const mapsLink = await getAnomaliesMapsLink(anomaly);
              await application.navigateToApp(MAPS_APP_ID, { path: mapsLink?.path });
            }}
            data-test-subj="mlAnomaliesListRowActionViewInMapsButton"
          >
            <FormattedMessage
              id="xpack.ml.anomaliesTable.linksMenu.viewInMapsLabel"
              defaultMessage="View in Maps"
            />
          </EuiContextMenuItem>
        );
      } else if (
        props.sourceIndicesWithGeoFields &&
        props.sourceIndicesWithGeoFields[anomaly.jobId]
      ) {
        items.push(
          <EuiContextMenuItem
            key="view_in_maps"
            icon="gisApp"
            onClick={async () => {
              const mapsLink = await getAnomalySourceMapsLink(
                anomaly,
                props.sourceIndicesWithGeoFields
              );
              await application.navigateToApp(MAPS_APP_ID, { path: mapsLink?.path });
            }}
            data-test-subj="mlAnomaliesListRowActionViewSourceIndexInMapsButton"
          >
            <FormattedMessage
              id="xpack.ml.anomaliesTable.linksMenu.viewSourceIndexInMapsLabel"
              defaultMessage="View source index in Maps"
            />
          </EuiContextMenuItem>
        );
      }
    }

    if (application.capabilities.discover_v2?.show && isCategorizationAnomalyRecord) {
      items.push(
        <EuiContextMenuItem
          key="view_examples"
          icon="popout"
          onClick={() => {
            closePopover();
            viewExamples();
          }}
          data-test-subj="mlAnomaliesListRowActionViewExamplesButton"
          disabled={viewExamplesUrlError !== undefined}
        >
          {viewExamplesUrlError !== undefined ? (
            <EuiToolTip content={viewExamplesUrlError}>
              <FormattedMessage
                id="xpack.ml.anomaliesTable.linksMenu.viewExamplesLabel"
                defaultMessage="View examples"
              />
            </EuiToolTip>
          ) : (
            <FormattedMessage
              id="xpack.ml.anomaliesTable.linksMenu.viewExamplesLabel"
              defaultMessage="View examples"
            />
          )}
        </EuiContextMenuItem>
      );
    }

    if (canConfigureRules) {
      items.push(
        <EuiContextMenuItem
          key="create_rule"
          icon="controlsHorizontal"
          onClick={() => {
            closePopover();
            props.showRuleEditorFlyout(anomaly, focusTrapProps);
          }}
          data-test-subj="mlAnomaliesListRowActionConfigureRulesButton"
        >
          <FormattedMessage
            id="xpack.ml.anomaliesTable.linksMenu.configureRulesLabel"
            defaultMessage="Configure job rules"
          />
        </EuiContextMenuItem>
      );
    }

    if (showAnomalyAlertFlyout && canCreateMlAlerts) {
      items.push(
        <EuiContextMenuItem
          key="create_alert_rule"
          icon="bell"
          onClick={() => {
            closePopover();
            showAnomalyAlertFlyout(anomaly);
          }}
          data-test-subj="mlAnomaliesListRowActionCreateAlertRuleButton"
        >
          <FormattedMessage
            id="xpack.ml.anomaliesTable.linksMenu.createAlertRuleLabel"
            defaultMessage="Create alert rule"
          />
        </EuiContextMenuItem>
      );
    }

    if (openInLogRateAnalysisUrl && canUseAiops) {
      items.push(
        <EuiContextMenuItem
          key="log_rate_analysis"
          icon="logRateAnalysis"
          href={openInLogRateAnalysisUrl}
          data-test-subj="mlAnomaliesListRowAction_runLogRateAnalysisButton"
        >
          <FormattedMessage
            id="xpack.ml.anomaliesTable.linksMenu.runLogRateAnalysis"
            defaultMessage="Run log rate analysis"
          />
        </EuiContextMenuItem>
      );
    }

    if (messageField !== null && canUseAiops) {
      items.push(
        <EuiContextMenuItem
          key="run_pattern_analysis"
          icon="logPatternAnalysis"
          onClick={() => {
            closePopover();
            const additionalField = getAdditionalField(anomaly);
            uiActions.executeTriggerActions(CATEGORIZE_FIELD_TRIGGER, {
              dataView: messageField.dataView,
              field: messageField.field,
              originatingApp: PLUGIN_ID,
              additionalFilter: {
                from: anomaly.source.timestamp,
                to: anomaly.source.timestamp + anomaly.source.bucket_span * 1000,
                ...(additionalField !== null
                  ? {
                      field: {
                        name: additionalField.name,
                        value: additionalField.value,
                      },
                    }
                  : {}),
              },
              focusTrapProps,
            });
          }}
          data-test-subj="mlAnomaliesListRowActionPatternAnalysisButton"
        >
          <FormattedMessage
            id="xpack.ml.anomaliesTable.linksMenu.patternAnalysisLabel"
            defaultMessage="Run pattern analysis"
          />
        </EuiContextMenuItem>
      );
    }

    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataViewId,
    dataViewIdWithTemporary,
    openInDiscoverUrl,
    openInDiscoverUrlError,
    viewExamplesUrlError,
    viewExamples,
    viewSeries,
    canConfigureRules,
    canCreateMlAlerts,
    isCategorizationAnomalyRecord,
  ]);

  return (
    <EuiContextMenuPanel items={contextMenuItems} data-test-subj="mlAnomaliesListRowActionsMenu" />
  );
};

export const LinksMenu: FC<Omit<LinksMenuProps, 'onItemClick'>> = (props) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const onButtonClick = setPopoverOpen.bind(null, !isPopoverOpen);
  const closePopover = setPopoverOpen.bind(null, false);

  const button = (
    <EuiButtonIcon
      size="s"
      color="text"
      onClick={onButtonClick}
      iconType="gear"
      aria-label={i18n.translate('xpack.ml.anomaliesTable.linksMenu.selectActionAriaLabel', {
        defaultMessage: 'Select action for anomaly at {time}',
        values: { time: formatHumanReadableDateTimeSeconds(props.anomaly.time) },
      })}
      data-test-subj="mlAnomaliesListRowActionsButton"
      id={`mlAnomaliesListRowActionsButton-${props.anomaly.rowId}`}
    />
  );

  return (
    <div>
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <LinksMenuUI {...props} onItemClick={closePopover} />
      </EuiPopover>
    </div>
  );
};

function getAdditionalField(anomaly: MlAnomaliesTableRecord) {
  if (anomaly.entityName === undefined || anomaly.entityValue === undefined) {
    return null;
  }

  if (anomaly.entityName === MLCATEGORY) {
    if (
      anomaly.source.partition_field_name === undefined ||
      anomaly.source.partition_field_value === undefined
    ) {
      return null;
    }
    return {
      name: anomaly.source.partition_field_name,
      value: anomaly.source.partition_field_value,
    };
  }
  return { name: anomaly.entityName, value: anomaly.entityValue };
}
