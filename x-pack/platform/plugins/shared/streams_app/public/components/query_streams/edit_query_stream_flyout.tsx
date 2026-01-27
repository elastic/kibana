/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiPanel,
  EuiResizableContainer,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import type { AggregateQuery } from '@kbn/es-query';
import { useForm } from 'react-hook-form';
import { css } from '@emotion/css';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { isError } from 'lodash';
import type { SampleDocument, Streams } from '@kbn/streams-schema';
import { esqlResultToPlainObjects } from '../../util/esql_result_to_plain_objects';
import { QueryStreamForm } from './query_stream_form';
import { QueryStreamPreviewPanel } from './query_stream_preview_panel';
import { useKibana } from '../../hooks/use_kibana';
import { getFormattedError } from '../../util/errors';
import { executeEsqlQuery } from '../../hooks/use_execute_esql_query';
import { useTimefilter } from '../../hooks/use_timefilter';
import { StreamsAppSearchBar } from '../streams_app_search_bar';

interface EditQueryStreamFlyoutProps {
  definition: Streams.QueryStream.GetResponse;
  onClose: () => void;
  onSave: () => void;
}

interface FormState {
  esqlQuery: string;
}

export function EditQueryStreamFlyout({
  definition,
  onClose,
  onSave,
}: EditQueryStreamFlyoutProps) {
  const { dependencies, core } = useKibana();
  const { notifications } = core;
  const {
    data,
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  const { timeState } = useTimefilter();
  const streamName = definition.stream.name;
  const resolvedEsql = definition.stream.query.esql;

  const { formState, register, handleSubmit, setValue, watch } = useForm<FormState>({
    defaultValues: {
      esqlQuery: '',
    },
  });

  register('esqlQuery', {
    required: i18n.translate('xpack.streams.editQueryStreamFlyout.queryRequired', {
      defaultMessage: 'Query is required',
    }),
  });
  const esqlQuery = watch('esqlQuery');

  const abortController = useAbortController();

  const handleQueryStreamUpdate = handleSubmit(async (formData) => {
    try {
      await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_query 2023-10-31', {
        params: { path: { name: streamName }, body: { query: { esql: formData.esqlQuery } } },
        signal: abortController.signal,
      });
      onSave();
      onClose();
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.editQueryStreamFlyout.successTitle', {
          defaultMessage: 'Query stream updated successfully',
        }),
        toastLifeTimeMs: 3000,
      });
    } catch (error) {
      const formattedError = getFormattedError(error);
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.streams.editQueryStreamFlyout.errorTitle', {
          defaultMessage: 'Error updating query stream',
        }),
        text: formattedError.message,
        toastLifeTimeMs: 3000,
      });
    }
  });

  const [
    { value: documents, error: documentsError, loading: isLoadingQueryResults },
    handleQuerySubmit,
  ] = useAsyncFn(
    async (query?: AggregateQuery | undefined, controller?: AbortController | undefined) => {
      if (!query) {
        return;
      }

      const results = await executeEsqlQuery({
        query: query.esql,
        search: data.search.search,
        signal: controller?.signal,
        start: timeState.start,
        end: timeState.end,
        dropNullColumns: true,
      });

      return esqlResultToPlainObjects(results) as SampleDocument[];
    },
    [timeState.start, timeState.end]
  );

  useEffect(() => {
    if (resolvedEsql) {
      setValue('esqlQuery', resolvedEsql, { shouldValidate: true });
    }
  }, [resolvedEsql, setValue]);

  useEffect(() => {
    // Execute query when it changes to show initial preview
    if (esqlQuery) {
      handleQuerySubmit({ esql: esqlQuery });
    }
  }, [handleQuerySubmit, esqlQuery]);

  return (
    <EuiFlyout size="l" onClose={onClose} aria-labelledby="edit-query-stream-flyout-title">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id="edit-query-stream-flyout-title">
            {i18n.translate('xpack.streams.editQueryStreamFlyout.editQueryStreamTitleLabel', {
              defaultMessage: 'Edit Query Stream: {streamName}',
              values: { streamName },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        className={css`
          .euiFlyoutBody__overflowContent {
            height: 100%;
            display: flex;
            padding: 0;
          }
        `}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow>
            <EuiPanel
              hasShadow={false}
              className={css`
                display: flex;
                max-width: 100%;
                overflow: auto;
                flex-grow: 1;
              `}
              paddingSize="none"
            >
              <EuiResizableContainer>
                {(EuiResizablePanel, EuiResizableButton) => (
                  <>
                    <EuiResizablePanel
                      initialSize={40}
                      minSize="350px"
                      tabIndex={0}
                      paddingSize="l"
                    >
                      <QueryStreamForm>
                        <QueryStreamForm.ESQLEditor
                          isLoading={isLoadingQueryResults}
                          query={{ esql: esqlQuery }}
                          onTextLangQueryChange={(query) =>
                            setValue('esqlQuery', query.esql, { shouldValidate: true })
                          }
                          onTextLangQuerySubmit={async (query, controller) => {
                            await handleQuerySubmit(query, controller);
                          }}
                          errors={[
                            formState.errors.esqlQuery
                              ? new Error(formState.errors.esqlQuery.message)
                              : undefined,
                            documentsError,
                          ].filter(isError)}
                        />
                      </QueryStreamForm>
                    </EuiResizablePanel>

                    <EuiResizableButton indicator="border" />

                    <EuiResizablePanel
                      initialSize={60}
                      tabIndex={0}
                      minSize="300px"
                      paddingSize="l"
                      className={css`
                        display: flex;
                        flex-direction: column;
                      `}
                    >
                      <EuiFlexItem grow={false} data-test-subj="queryStreamPreviewPanel">
                        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" wrap>
                          <EuiFlexGroup component="span" gutterSize="s">
                            <EuiIcon type="inspect" />
                            <strong>
                              {i18n.translate('xpack.streams.queryStreamFlyout.previewHeader', {
                                defaultMessage: 'Data Preview for query stream',
                              })}
                            </strong>
                          </EuiFlexGroup>
                          <StreamsAppSearchBar showDatePicker />
                        </EuiFlexGroup>
                      </EuiFlexItem>
                      <EuiSpacer size="m" />
                      <EuiFlexItem grow>
                        <QueryStreamPreviewPanel
                          documents={documents}
                          isLoading={isLoadingQueryResults}
                          error={documentsError}
                        />
                      </EuiFlexItem>
                    </EuiResizablePanel>
                  </>
                )}
              </EuiResizableContainer>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty
            data-test-subj="streamsAppEditQueryStreamFlyoutCancelButton"
            iconType="cross"
            onClick={onClose}
            flush="left"
          >
            {i18n.translate('xpack.streams.editQueryStreamFlyout.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            data-test-subj="streamsAppEditQueryStreamFlyoutSaveButton"
            isLoading={formState.isSubmitting}
            disabled={(formState.isSubmitted && !formState.isValid) || !!documentsError || isLoadingQuery}
            onClick={handleQueryStreamUpdate}
          >
            {i18n.translate('xpack.streams.editQueryStreamFlyout.saveButtonLabel', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

