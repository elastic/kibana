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
import { useAbortController, useBoolean } from '@kbn/react-hooks';
import type { AggregateQuery } from '@kbn/es-query';
import { useForm } from 'react-hook-form';
import { css } from '@emotion/css';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { isError } from 'lodash';
import type { SampleDocument } from '@kbn/streams-schema';
import { esqlResultToPlainObjects } from '../../util/esql_result_to_plain_objects';
import { QueryStreamForm } from './query_stream_form';
import { QueryStreamPreviewPanel } from './query_stream_preview_panel';
import { useKibana } from '../../hooks/use_kibana';
import { getFormattedError } from '../../util/errors';
import { executeEsqlQuery } from '../../hooks/use_execute_esql_query';
import { useTimefilter } from '../../hooks/use_timefilter';
import { StreamsAppSearchBar } from '../streams_app_search_bar';

interface CreateQueryStreamFlyoutProps {
  onQueryStreamCreated: () => void;
}

interface FormState {
  name: string;
  esqlQuery: string;
}

export function CreateQueryStreamFlyout({ onQueryStreamCreated }: CreateQueryStreamFlyoutProps) {
  const [isFlyoutOpen, { toggle: toggleFlyout, off: closeFlyout }] = useBoolean(false);

  return (
    <>
      <EuiButton onClick={toggleFlyout} size="s">
        {i18n.translate('xpack.streams.streamsListView.createQueryStreamButtonLabel', {
          defaultMessage: 'Create Query stream',
        })}
      </EuiButton>
      {isFlyoutOpen && (
        <QueryStreamFlyout onClose={closeFlyout} onQueryStreamCreated={onQueryStreamCreated} />
      )}
    </>
  );
}

const QueryStreamFlyout = ({
  onClose,
  onQueryStreamCreated,
}: {
  onClose: () => void;
  onQueryStreamCreated: () => void;
}) => {
  const { dependencies, core } = useKibana();
  const { notifications } = core;
  const {
    data,
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  const { timeState } = useTimefilter();
  const timeStateRef = React.useRef(timeState);
  timeStateRef.current = timeState;

  const { formState, register, handleSubmit, setValue, watch } = useForm<FormState>({
    defaultValues: {
      name: '',
      esqlQuery: '',
    },
  });

  register('name', {
    required: i18n.translate('xpack.streams.createQueryStreamFlyout.nameRequired', {
      defaultMessage: 'Name is required',
    }),
  });
  register('esqlQuery', {
    required: i18n.translate('xpack.streams.createQueryStreamFlyout.queryRequired', {
      defaultMessage: 'Query is required',
    }),
  });
  const { name: streamName, esqlQuery } = watch();

  const abortController = useAbortController();

  const handleQueryStreamCreation = handleSubmit(async (formData) => {
    try {
      await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_query 2023-10-31', {
        params: { path: { name: formData.name }, body: { query: { esql: formData.esqlQuery } } },
        signal: abortController.signal,
      });
      onQueryStreamCreated();
      onClose();
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.createQueryStreamFlyout.successTitle', {
          defaultMessage: 'Query stream created successfully',
        }),
        toastLifeTimeMs: 3000,
      });
    } catch (error) {
      const formattedError = getFormattedError(error);
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.streams.createQueryStreamFlyout.errorTitle', {
          defaultMessage: 'Error creating query stream',
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
        start: timeStateRef.current.start,
        end: timeStateRef.current.end,
        dropNullColumns: true,
      });

      return esqlResultToPlainObjects(results) as SampleDocument[];
    },
    [data.search.search]
  );

  useEffect(() => {
    // Update query when it changes or time range updates (handleQuerySubmit changes when time changes)
    if (esqlQuery) {
      handleQuerySubmit({ esql: esqlQuery });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleQuerySubmit, timeState]);

  return (
    <EuiFlyout size="l" onClose={onClose} aria-labelledby="create-query-stream-flyout-title">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id="create-query-stream-flyout-title">
            {i18n.translate('xpack.streams.createQueryStreamFlyout.createQueryStreamTitleLabel', {
              defaultMessage: 'Create Query Stream',
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
                        <QueryStreamForm.StreamName
                          partitionName={streamName}
                          onChange={(name) => setValue('name', name, { shouldValidate: true })}
                          error={formState.errors.name?.message}
                          isInvalid={Boolean(formState.errors.name?.message)}
                        />
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
                      <EuiFlexItem grow={false} data-test-subj="routingPreviewPanel">
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
            data-test-subj="streamsAppCreateQueryStreamFlyoutCancelButton"
            iconType="cross"
            onClick={onClose}
            flush="left"
          >
            {i18n.translate('xpack.streams.createQueryStreamFlyout.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            data-test-subj="streamsAppCreateQueryStreamFlyoutCreateButton"
            isLoading={formState.isSubmitting}
            disabled={(formState.isSubmitted && !formState.isValid) || !!documentsError}
            onClick={handleQueryStreamCreation}
          >
            {i18n.translate('xpack.streams.createQueryStreamFlyout.createQueryStreamButtonLabel', {
              defaultMessage: 'Create Query Stream',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
