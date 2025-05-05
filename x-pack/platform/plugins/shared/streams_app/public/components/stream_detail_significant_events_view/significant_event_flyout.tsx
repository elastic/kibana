/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { StreamQueryKql, streamQuerySchema } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { v4 } from 'uuid';
import { fromKueryExpression } from '@kbn/es-query';
import moment from 'moment';
import { calculateAuto } from '@kbn/calculate-auto';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { SparkPlot } from '../spark_plot';
import { formatChangePoint } from './change_point';
import { getAnnotationFromFormattedChangePoint } from './utils/get_annotation_from_formatted_change_point';
import { useTimefilter } from '../../hooks/use_timefilter';
import { UncontrolledStreamsAppSearchBar } from '../streams_app_search_bar/uncontrolled_streams_app_bar';

function getTitle(query?: StreamQueryKql) {
  if (!query) {
    return i18n.translate('xpack.significantEventFlyout.addNewQueryFlyoutTitle', {
      defaultMessage: 'Add significant event',
    });
  }

  return i18n.translate('xpack.significantEventFlyout.editQueryFlyoutTitle', {
    defaultMessage: 'Edit {title}',
    values: {
      title: query.title,
    },
  });
}

function getSubmitTitle(query?: StreamQueryKql) {
  if (!query) {
    return i18n.translate('xpack.significantEventFlyout.addButtonLabel', {
      defaultMessage: 'Add',
    });
  }

  return i18n.translate('xpack.significantEventFlyout.editButtonLabel', {
    defaultMessage: 'Save changes',
    values: {
      title: query.title,
    },
  });
}

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
    ...query,
  });

  const [touched, setTouched] = useState({ title: false, kql: false });

  const [loading, setLoading] = useState(false);

  const theme = useEuiTheme().euiTheme;

  const {
    dependencies: {
      start: { data, streams },
    },
  } = useKibana();

  const {
    timeState: { timeRange: initialTimeRange },
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

  const validation = useMemo(() => {
    const { title = '', kql: { query: kqlQuery } = { query: '' } } = queryValues;
    const titleEmptyError = title.length === 0;
    const kqlEmptyError = kqlQuery.length === 0;

    const titleErrorMessage = titleEmptyError
      ? i18n.translate('xpack.significantEventFlyout.formFieldTitleRequiredError', {
          defaultMessage: 'Required',
        })
      : undefined;

    let kqlSyntaxError = false;

    if (!kqlEmptyError) {
      try {
        fromKueryExpression(kqlQuery);
      } catch (error) {
        kqlSyntaxError = true;
      }
    }

    const kqlErrorMessage = kqlSyntaxError
      ? i18n.translate('xpack.significantEventFlyout.formFieldQuerySyntaxError', {
          defaultMessage: 'Invalid syntax',
        })
      : kqlEmptyError
      ? i18n.translate('xpack.significantEventFlyout.formFieldQueryRequiredError', {
          defaultMessage: 'Required',
        })
      : undefined;

    return {
      title: titleErrorMessage,
      kql: kqlErrorMessage,
    };
  }, [queryValues]);

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

  const previewFetch = useStreamsAppFetch(
    ({ signal }) => {
      const { id, kql, title } = queryValues;
      if (!id || !kql?.query || !title) {
        return;
      }

      const { from, to } = getAbsoluteTimeRange(timeRange);

      const bucketSize = calculateAuto
        .near(50, moment.duration(moment(to).diff(from)))
        ?.asSeconds()!;

      return streams.streamsRepositoryClient.fetch(
        `POST /api/streams/{name}/significant_events/_preview`,
        {
          signal,
          params: {
            path: {
              name,
            },
            query: {
              bucketSize: `${bucketSize}s`,
              from,
              to,
            },
            body: {
              query: {
                id,
                kql,
                title,
              },
            },
          },
        }
      );
    },
    [timeRange, name, queryValues, streams.streamsRepositoryClient]
  );

  const sparkPlotData = useMemo(() => {
    const changePoints = previewFetch.value?.change_points;
    const occurrences = previewFetch.value?.occurrences;

    const timeseries =
      occurrences?.map(({ date, count }) => {
        return {
          x: new Date(date).getTime(),
          y: count,
        };
      }) ?? [];

    const { id, kql, title } = queryValues;

    const change =
      changePoints && occurrences && id && kql && title
        ? formatChangePoint({
            change_points: changePoints,
            occurrences: timeseries,
            query: {
              id,
              kql,
              title,
            },
          })
        : undefined;

    return {
      timeseries,
      annotations: change
        ? [
            getAnnotationFromFormattedChangePoint({
              query: {
                id,
              },
              change,
              theme,
            }),
          ]
        : [],
    };
  }, [previewFetch.value, queryValues, theme]);

  const parsedQuery = useMemo(() => {
    return streamQuerySchema.safeParse(queryValues);
  }, [queryValues]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{getTitle(query)}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm fullWidth>
          <EuiFormRow
            {...validationMessages.title}
            label={
              <EuiFormLabel>
                {i18n.translate('xpack.significantEventFlyout.formFieldTitleLabel', {
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
                {i18n.translate('xpack.significantEventFlyout.formFieldQueryLabel', {
                  defaultMessage: 'Query',
                })}
              </EuiFormLabel>
            }
            {...validationMessages.kql}
          >
            <UncontrolledStreamsAppSearchBar
              query={queryValues.kql?.query ?? ''}
              showQueryInput
              onQueryChange={() => {
                setTouched((prev) => ({ ...prev, kql: true }));
              }}
              onQuerySubmit={(next) => {
                setQueryValues((prev) => ({ ...prev, kql: { query: next.query } }));
                setTouched((prev) => ({ ...prev, kql: true }));
                if (next.dateRange) {
                  setTimeRange(next.dateRange);
                }
              }}
              dateRangeFrom={timeRange.from}
              dateRangeTo={timeRange.to}
              placeholder={i18n.translate('xpack.significantEventFlyout.queryPlaceholder', {
                defaultMessage: 'Filter events',
              })}
              dataViews={dataViewsFetch.value}
            />
          </EuiFormRow>
        </EuiForm>
        <EuiSpacer size="s" />
        <SparkPlot
          id={`query_preview_${query?.id}`}
          name={i18n.translate('xpack.significantEventFlyout.previewChartSeriesName', {
            defaultMessage: `Count`,
          })}
          timeseries={sparkPlotData.timeseries}
          type="bar"
          annotations={sparkPlotData.annotations}
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
            {i18n.translate('xpack.significantEventFlyout.cancelButtonLabel', {
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
            {getSubmitTitle(query)}
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
