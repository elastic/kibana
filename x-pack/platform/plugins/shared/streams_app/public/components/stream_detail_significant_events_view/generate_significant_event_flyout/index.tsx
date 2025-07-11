/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  type EuiBasicTableColumn,
  type EuiTableSelectionType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql } from '@kbn/streams-schema';
import React, { useState } from 'react';
import { v4 } from 'uuid';
import { useKibana } from '../../../hooks/use_kibana';
import { useSignificantEventsApi } from '../../../hooks/use_significant_events_api';
import { useAIFeatures } from './use_ai_features';

interface GenerateSignificantEventFlyoutProps {
  onClose?: () => void;
  onSubmit: (selected: StreamQueryKql[]) => Promise<void>;
  name: string;
}

export function GenerateSignificantEventFlyout(props: GenerateSignificantEventFlyoutProps) {
  return (
    <EuiFlyout onClose={() => props.onClose?.()} size="m">
      <SignificantEventFlyoutContents {...props} />
    </EuiFlyout>
  );
}

function SignificantEventFlyoutContents(props: GenerateSignificantEventFlyoutProps) {
  const {
    core: { notifications },
  } = useKibana();
  const { enabled: aiEnabled, selectedConnector } = useAIFeatures();
  const { generate } = useSignificantEventsApi({ name: props.name });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQueries, setGeneratedQueries] = useState<StreamQueryKql[]>([]);
  const [selectedQueries, setSelectedQueries] = useState<StreamQueryKql[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSelectionChange = (selectedItems: StreamQueryKql[]) => {
    setSelectedQueries(selectedItems);
  };

  const columns: Array<EuiBasicTableColumn<StreamQueryKql>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.streams.streamDetailView.generateSignificantEvents.titleColumn', {
        defaultMessage: 'Title',
      }),
    },
    {
      field: 'kql',
      name: i18n.translate('xpack.streams.streamDetailView.generateSignificantEvents.queryColumn', {
        defaultMessage: 'Query',
      }),
      render: (_, item: StreamQueryKql) => (
        <EuiCodeBlock paddingSize="s" fontSize="s">
          {item.kql.query}
        </EuiCodeBlock>
      ),
    },
  ];

  const selection: EuiTableSelectionType<StreamQueryKql> = {
    onSelectionChange,
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.streams.streamDetailView.generateSignificantEvents', {
              defaultMessage: 'Generate significant events',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexGroup>
            <EuiButton
              isLoading={isGenerating}
              disabled={isGenerating || !aiEnabled || !selectedConnector}
              iconType="sparkles"
              onClick={() => {
                setIsGenerating(true);
                setGeneratedQueries([]);
                setSelectedQueries([]);

                const generation$ = generate({
                  connectorId: selectedConnector!,
                });
                generation$.subscribe({
                  next: (result) => {
                    setGeneratedQueries((prev) => [
                      ...prev,
                      { id: v4(), kql: { query: result.query.kql }, title: result.query.title },
                    ]);
                  },
                  error: (error) => {
                    notifications.showErrorDialog({
                      title: i18n.translate(
                        'xpack.streams.streamDetailView.generateSignificantEvents.generateErrorToastTitle',
                        { defaultMessage: `Could not generate significant events queries` }
                      ),
                      error,
                    });
                    setIsGenerating(false);
                  },
                  complete: () => {
                    notifications.toasts.addSuccess({
                      title: i18n.translate(
                        'xpack.streams.streamDetailView.generateSignificantEvents.generateSuccessToastTitle',
                        { defaultMessage: `Generated significant events successfully` }
                      ),
                    });
                    setIsGenerating(false);
                  },
                });
              }}
            >
              {isGenerating
                ? i18n.translate(
                    'xpack.streams.streamDetailView.generateSignificantEvents.generatingButtonLabel',
                    { defaultMessage: 'Generating...' }
                  )
                : i18n.translate(
                    'xpack.streams.streamDetailView.generateSignificantEvents.generateButtonLabel',
                    { defaultMessage: 'Generate' }
                  )}
            </EuiButton>
          </EuiFlexGroup>

          <EuiBasicTable
            responsiveBreakpoint={false}
            items={generatedQueries}
            itemId="id"
            rowHeader="title"
            columns={columns}
            selection={selection}
            noItemsMessage={i18n.translate(
              'xpack.streams.streamDetailView.generateSignificantEvents.noQueriesMessage',
              { defaultMessage: 'No significant events queries generated' }
            )}
          />
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiButton
            color="text"
            onClick={() => {
              props.onClose?.();
            }}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.generateSignificantEvents.cancelButtonLabel',
              { defaultMessage: 'Cancel' }
            )}
          </EuiButton>
          <EuiButton
            disabled={isGenerating || selectedQueries.length === 0 || isSubmitting}
            isLoading={isSubmitting}
            color="primary"
            fill
            iconType="plusInCircle"
            onClick={() => {
              setIsSubmitting(true);
              props.onSubmit(selectedQueries).finally(() => {
                setIsSubmitting(false);
              });
            }}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.generateSignificantEvents.addSelectedButtonLabel',
              { defaultMessage: 'Add selected' }
            )}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}
