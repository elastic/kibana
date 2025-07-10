/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { niceTimeFormatter } from '@elastic/charts';
import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormLabel,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamQueryKql, streamQuerySchema } from '@kbn/streams-schema';
import React, { useMemo, useState } from 'react';
import { v4 } from 'uuid';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { SparkPlot } from '../../spark_plot';
import { UncontrolledStreamsAppSearchBar } from '../../streams_app_search_bar/uncontrolled_streams_app_bar';
import { getSigEventFlyoutTitle, getSigEventSubmitTitle } from './i18n';
import { useSignificantEventPreviewFetch } from './use_significant_event_preview_fetch';
import { useSignificantEventValidation } from './use_significant_event_validation';
import { useSparkplotDataFromSigEvents } from './use_spark_plot_data_from_sig_events';

interface SignificantEventFlyoutProps {
  name: string;
  onClose?: () => void;
  onCreate?: (query: StreamQueryKql) => Promise<void>;
  onUpdate?: (query: StreamQueryKql) => Promise<void>;
  query?: StreamQueryKql;
}

export function SignificantEventFlyoutContents({
  name,
  query,
  onClose,
  onCreate,
  onUpdate,
}: SignificantEventFlyoutProps) {
  const [queryValues, setQueryValues] = useState<{ id: string } & Partial<StreamQueryKql>>({
    id: v4(),
    kql: {
      query: '',
    },
    ...query,
  });

  const [touched, setTouched] = useState({ title: false, kql: false });

  const [loading, setLoading] = useState(false);

  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const {
    timeState: { timeRange: initialTimeRange, start, end },
  } = useTimefilter();

  const [timeRange, setTimeRange] = useState(initialTimeRange);

  const dataViewsFetch = useStreamsAppFetch(() => {
    return data.dataViews
      .create({
        title: name,
      })
      .then((value) => {
        return [value];
      });
  }, [data.dataViews, name]);

  const validation = useSignificantEventValidation({ queryValues });

  const validationMessages = useMemo(() => {
    return {
      title:
        validation.title && touched.title
          ? {
              isInvalid: true,
              error: validation.title,
            }
          : {},
      kql:
        validation.kql && touched.kql
          ? {
              isInvalid: true,
              error: validation.kql,
            }
          : {},
    };
  }, [validation, touched]);

  const previewFetch = useSignificantEventPreviewFetch({
    name,
    queryValues,
    timeRange,
  });

  const xFormatter = useMemo(() => {
    return niceTimeFormatter([start, end]);
  }, [start, end]);

  const sparkPlotData = useSparkplotDataFromSigEvents({
    previewFetch,
    queryValues,
    xFormatter,
  });

  const parsedQuery = useMemo(() => {
    return streamQuerySchema.safeParse(queryValues);
  }, [queryValues]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{getSigEventFlyoutTitle(query)}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm fullWidth>
          <EuiFormRow
            {...validationMessages.title}
            label={
              <EuiFormLabel>
                {i18n.translate('xpack.streams.significantEventFlyout.formFieldTitleLabel', {
                  defaultMessage: 'Title',
                })}
              </EuiFormLabel>
            }
          >
            <EuiFieldText
              value={queryValues?.title}
              onChange={(event) => {
                const next = event.currentTarget.value;
                setQueryValues((prev) => ({ ...prev, title: next }));
                setTouched((prev) => ({ ...prev, title: true }));
              }}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <EuiFormLabel>
                {i18n.translate('xpack.streams.significantEventFlyout.formFieldQueryLabel', {
                  defaultMessage: 'Query',
                })}
              </EuiFormLabel>
            }
            {...validationMessages.kql}
          >
            <UncontrolledStreamsAppSearchBar
              query={
                queryValues.kql
                  ? { language: 'kuery', ...queryValues.kql }
                  : { language: 'kuery', query: '' }
              }
              showQueryInput
              onQueryChange={() => {
                setTouched((prev) => ({ ...prev, kql: true }));
              }}
              onQuerySubmit={(next) => {
                setQueryValues((prev) => ({
                  ...prev,
                  kql: {
                    query: typeof next.query?.query === 'string' ? next.query.query : '',
                  },
                }));
                setTouched((prev) => ({ ...prev, kql: true }));
                if (next.dateRange) {
                  setTimeRange(next.dateRange);
                }
              }}
              dateRangeFrom={timeRange.from}
              dateRangeTo={timeRange.to}
              placeholder={i18n.translate('xpack.streams.significantEventFlyout.queryPlaceholder', {
                defaultMessage: 'Filter events',
              })}
              indexPatterns={dataViewsFetch.value}
              submitOnBlur
            />
          </EuiFormRow>
        </EuiForm>
        <EuiSpacer size="s" />
        <SparkPlot
          id={`query_preview_${query?.id}`}
          name={i18n.translate('xpack.streams.significantEventFlyout.previewChartSeriesName', {
            defaultMessage: `Count`,
          })}
          timeseries={sparkPlotData.timeseries}
          type="bar"
          annotations={sparkPlotData.annotations}
          xFormatter={xFormatter}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiButton
            color="text"
            onClick={() => {
              onClose?.();
            }}
          >
            {i18n.translate('xpack.streams.significantEventFlyout.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButton>
          <EuiButton
            color="primary"
            fill
            iconType={query ? 'save' : 'plusInCircle'}
            disabled={loading || !parsedQuery.success}
            isLoading={loading}
            onClick={() => {
              if (!parsedQuery.success) {
                return;
              }

              setLoading(true);

              if (query) {
                onUpdate?.(parsedQuery.data).finally(() => {
                  setLoading(false);
                });
              } else {
                onCreate?.(parsedQuery.data).finally(() => {
                  setLoading(false);
                });
              }
            }}
          >
            {getSigEventSubmitTitle(query)}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}
export function SignificantEventFlyout(props: SignificantEventFlyoutProps) {
  return (
    <EuiFlyout
      onClose={() => {
        props.onClose?.();
      }}
      size="m"
    >
      <SignificantEventFlyoutContents {...props} />
    </EuiFlyout>
  );
}
