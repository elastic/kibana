/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { EuiFormRow, EuiSpacer, EuiCallOut, EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Query, Filter } from '@kbn/es-query';
import type { DataView, FieldSpec } from '@kbn/data-views-plugin/public';
import type { MlAnomalyResultType } from '@kbn/ml-anomaly-utils';
import { ML_RESULTS_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import type { CombinedJobWithStats } from '../../../common/types/anomaly_detection_jobs';
import { getRelevantAnomalyFields } from './get_relevant_anomaly_fields';
import { useMlKibana } from '../../application/contexts/kibana';

interface AnomalyKqlFilterProps {
  value: string | null | undefined;
  onChange: (filter: string | null) => void;
  jobConfigs: CombinedJobWithStats[];
  resultType: MlAnomalyResultType;
  jobId?: string;
  errors?: string[];
  disabled?: boolean;
}

export const AnomalyKqlFilter: FC<AnomalyKqlFilterProps> = React.memo(
  ({ value, onChange, jobConfigs, resultType, jobId, errors, disabled }) => {
    const { services } = useMlKibana();
    const { unifiedSearch, data } = services;
    const dataViewsService = data?.dataViews;

    const [mlAnomaliesDataView, setMlAnomaliesDataView] = useState<DataView>();

    const relevantFields = useMemo(
      () => getRelevantAnomalyFields(jobConfigs, resultType),
      [jobConfigs, resultType]
    );

    // Create filter for autocomplete suggestions - only show values from current job
    const filtersForSuggestions = useMemo<Filter[]>(() => {
      if (!jobId) return [];

      return [
        {
          meta: {
            disabled: false,
            negate: false,
            alias: null,
            key: 'job_id',
          },
          query: {
            match_phrase: {
              job_id: jobId,
            },
          },
        },
      ];
    }, [jobId]);

    useEffect(
      function fetchAndCreateDataView() {
        if (!dataViewsService || disabled) return;

        let isMounted = true;
        let createdDataView: DataView | undefined;

        const fetchDataView = async () => {
          try {
            const allFields = await dataViewsService.getFieldsForWildcard({
              pattern: ML_RESULTS_INDEX_PATTERN,
            });

            const filteredFields =
              relevantFields.length > 0
                ? allFields.filter((field) => relevantFields.includes(field.name))
                : allFields;

            const fieldsMap = filteredFields.reduce<Record<string, FieldSpec>>((acc, field) => {
              acc[field.name] = field;
              return acc;
            }, {});

            const dataView = await dataViewsService.create(
              {
                title: ML_RESULTS_INDEX_PATTERN,
                fields: fieldsMap,
              },
              true
            );

            createdDataView = dataView;

            if (isMounted) {
              setMlAnomaliesDataView(dataView);
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to fetch/create ML anomalies data view:', error);
          }
        };

        fetchDataView();

        return () => {
          isMounted = false;
          if (createdDataView?.id) {
            dataViewsService.clearInstanceCache(createdDataView.id);
          }
        };
      },
      [dataViewsService, relevantFields, disabled]
    );

    /**
     * Handle KQL query changes
     * Note: Validation is handled by the parent form validation in register_anomaly_detection_rule.tsx
     * This avoids parsing the KQL twice (once here, once in validation)
     */
    const handleKqlChange = useCallback(
      (payload: { query?: Query }) => {
        const kqlText = (payload.query?.query as string) ?? '';
        onChange(kqlText.trim() || null);
      },
      [onChange]
    );

    return (
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.ml.anomalyDetectionAlert.anomalyFilterLabel"
            defaultMessage="Anomaly filter"
          />
        }
        helpText={
          disabled ? (
            <FormattedMessage
              id="xpack.ml.anomalyDetectionAlert.anomalyFilterDisabledDescription"
              defaultMessage="Filter is not available for bucket result type."
            />
          ) : (
            <FormattedMessage
              id="xpack.ml.anomalyDetectionAlert.anomalyFilterDescription"
              defaultMessage="Use a KQL expression to limit which anomalies trigger alerts."
            />
          )
        }
        data-test-subj="mlAnomalyAlertKqlFilterFormRow"
      >
        <div>
          <EuiSpacer size="s" />

          {unifiedSearch ? (
            <unifiedSearch.ui.SearchBar
              appName="ML"
              iconType="search"
              placeholder={i18n.translate('xpack.ml.anomalyDetectionAlert.kqlFilter.placeholder', {
                defaultMessage: 'Filter anomalies using KQL syntax',
              })}
              indexPatterns={mlAnomaliesDataView ? [mlAnomaliesDataView] : undefined}
              filtersForSuggestions={filtersForSuggestions}
              showQueryInput={true}
              showQueryMenu={false}
              showFilterBar={false}
              showDatePicker={false}
              showSubmitButton={false}
              displayStyle="inPage"
              onQueryChange={handleKqlChange}
              onQuerySubmit={handleKqlChange}
              query={{
                query: value ?? '',
                language: 'kuery',
              }}
              dataTestSubj="mlAnomalyAlertKqlSearchBar"
              submitOnBlur
              isDisabled={disabled}
            />
          ) : (
            <EuiSkeletonText
              lines={1}
              size="m"
              contentAriaLabel={i18n.translate(
                'xpack.ml.anomalyDetectionAlert.kqlFilter.loadingAriaLabel',
                {
                  defaultMessage: 'Loading KQL filter input',
                }
              )}
            />
          )}

          {errors && errors.length > 0 && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                announceOnMount
                title={i18n.translate('xpack.ml.anomalyDetectionAlert.kqlFilter.errorTitle', {
                  defaultMessage: 'Invalid KQL query',
                })}
                color="danger"
                iconType="alert"
                size="s"
              >
                {errors.map((error, index) => (
                  <p key={index}>{error}</p>
                ))}
              </EuiCallOut>
            </>
          )}
        </div>
      </EuiFormRow>
    );
  }
);

AnomalyKqlFilter.displayName = 'AnomalyKqlFilter';
