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
  EuiLink,
  EuiPanel,
  EuiResizableContainer,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
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
import { executeEsqlQuery } from '../../hooks/use_execute_esql_query';
import { useTimefilter } from '../../hooks/use_timefilter';
import { StreamsAppSearchBar } from '../streams_app_search_bar';

interface FormState {
  name: string;
  esqlQuery: string;
}

interface QueryStreamFlyoutProps {
  title: React.ReactNode;
  onClose: () => void;
  onSubmit: (formData: FormState, signal: AbortSignal) => Promise<void>;
  showNameField?: boolean;
  initialName?: string;
  initialEsql?: string;
  disableSubmitWhenLoading?: boolean;
}

export function QueryStreamFlyout({
  title,
  onClose,
  onSubmit,
  showNameField = false,
  initialName = '',
  initialEsql,
  disableSubmitWhenLoading = false,
}: QueryStreamFlyoutProps) {
  const { core, dependencies } = useKibana();
  const { data } = dependencies.start;

  const { timeState } = useTimefilter();
  const timeStateRef = React.useRef(timeState);
  timeStateRef.current = timeState;

  const { formState, register, handleSubmit, setValue, watch } = useForm<FormState>({
    defaultValues: {
      name: initialName,
      esqlQuery: '',
    },
  });

  register('name', {
    required: showNameField
      ? i18n.translate('xpack.streams.createQueryStreamFlyout.nameRequired', {
          defaultMessage: 'Name is required',
        })
      : false,
  });

  register('esqlQuery', {
    required: i18n.translate('xpack.streams.queryStreamFlyout.queryRequired', {
      defaultMessage: 'Query is required',
    }),
  });

  const { name: streamName, esqlQuery } = watch();

  const abortController = useAbortController();

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
    if (initialEsql !== undefined) {
      setValue('esqlQuery', initialEsql, { shouldValidate: true });
    }
  }, [initialEsql, setValue]);

  useEffect(() => {
    // Update query when it changes or time range updates (handleQuerySubmit changes when time changes)
    if (esqlQuery) {
      handleQuerySubmit({ esql: esqlQuery });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleQuerySubmit, timeState]);

  const handleFlyoutSubmit = handleSubmit(async (formData) => {
    await onSubmit(formData, abortController.signal);
  });

  return (
    <EuiFlyout size="l" onClose={onClose} aria-labelledby="query-stream-flyout-title">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id="query-stream-flyout-title">{title}</h2>
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
                      <EuiText component="p" size="s">
                        {i18n.translate('xpack.streams.queryStreamFlyout.description', {
                          defaultMessage: 'Use ES|QL to define your stream',
                        })}
                      </EuiText>
                      <EuiLink href={core.docLinks.links.query.queryESQL} target="_blank">
                        {i18n.translate('xpack.streams.queryStreamFlyout.viewDocumentation', {
                          defaultMessage: 'View documentation',
                        })}
                      </EuiLink>
                      <EuiSpacer size="m" />
                      <QueryStreamForm>
                        {showNameField && (
                          <QueryStreamForm.StreamName
                            partitionName={streamName}
                            onChange={(name) => setValue('name', name, { shouldValidate: true })}
                            error={formState.errors.name?.message}
                            isInvalid={Boolean(formState.errors.name?.message)}
                          />
                        )}
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
                      <EuiFlexItem grow={false} data-test-subj="streamsAppQueryStreamPreviewPanel">
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
            data-test-subj="streamsAppQueryStreamFlyoutCancelButton"
            iconType="cross"
            onClick={onClose}
            flush="left"
          >
            {i18n.translate('xpack.streams.queryStreamFlyout.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            data-test-subj="streamsAppQueryStreamFlyoutSaveButton"
            isLoading={formState.isSubmitting}
            disabled={
              (formState.isSubmitted && !formState.isValid) ||
              !!documentsError ||
              (disableSubmitWhenLoading && isLoadingQueryResults)
            }
            onClick={handleFlyoutSubmit}
          >
            {i18n.translate('xpack.streams.queryStreamFlyout.saveButtonLabel', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
