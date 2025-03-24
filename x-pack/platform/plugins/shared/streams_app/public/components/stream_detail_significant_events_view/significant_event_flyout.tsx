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
  EuiTitle,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { StreamQueryKql } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { v4 } from 'uuid';
import { fromKueryExpression } from '@kbn/es-query';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';

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
  indexPattern: string;
  onClose?: () => void;
  onCreate?: (query: StreamQueryKql) => Promise<void>;
  onUpdate?: (query: StreamQueryKql) => Promise<void>;
  query?: StreamQueryKql;
}

export function SignificantEventFlyoutContents({
  indexPattern,
  query,
  onClose,
}: SignificantEventFlyoutProps) {
  const [queryValues, setQueryValues] = useState<{ id: string } & Partial<StreamQueryKql>>({
    id: v4(),
    ...query,
  });

  const [touched, setTouched] = useState({ title: false, kql: false });

  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const { timeRange: initialTimeRange } = data.query.timefilter.timefilter.useTimefilter();

  const [timeRange, setTimeRange] = useState(initialTimeRange);

  const dataViewsFetch = useStreamsAppFetch(() => {
    return data.dataViews
      .create({
        title: indexPattern,
      })
      .then((value) => {
        return [value];
      });
  }, [data.dataViews, indexPattern]);

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

  const isAllValid = Object.values(validation)
    .flat()
    .every((msg) => !msg);

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
            <StreamsAppSearchBar
              query={queryValues.kql?.query ?? ''}
              showQueryInput
              onQueryChange={(next) => {
                setQueryValues((prev) => ({ ...prev, query: next.query }));
                setTouched((prev) => ({ ...prev, kql: true }));
              }}
              onQuerySubmit={(next) => {
                setQueryValues((prev) => ({ ...prev, query: next.query }));
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
            onClick={() => {}}
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
