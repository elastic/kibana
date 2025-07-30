/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamQueryKql, Streams, streamQuerySchema } from '@kbn/streams-schema';
import React, { useMemo, useState } from 'react';
import { v4 } from 'uuid';
import { FlowSelector } from './flow_selector';
import { ManualFlowForm } from './manual_flow_form/manual_flow_form';
import type { Flow } from './types';

interface Props {
  onClose?: () => void;
  definition: Streams.all.Definition;
  onSave: (queries: StreamQueryKql[]) => Promise<void>;
  query?: StreamQueryKql;
}

export function AddSignificantEventFlyout({ query, onClose, definition, onSave }: Props) {
  const isEditMode = !!query?.id;
  const [selectedFlow, setSelectedFlow] = useState<Flow | undefined>(
    isEditMode ? 'manual' : undefined
  );
  const [queries, setQueries] = useState<StreamQueryKql[]>([
    {
      id: v4(),
      title: '',
      kql: {
        query: '',
      },
      ...query,
    },
  ]);
  const [canSave, setCanSave] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedQueries = useMemo(() => {
    return streamQuerySchema.array().safeParse(queries);
  }, [queries]);

  return (
    <EuiFlyout aria-labelledby="addSignificantEventFlyout" onClose={() => onClose?.()} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.streams.streamDetailView.addSignificantEventFlyout', {
              defaultMessage: 'Add significant events',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          {!isEditMode && (
            <FlowSelector selected={selectedFlow} onSelect={(flow) => setSelectedFlow(flow)} />
          )}

          {selectedFlow === 'manual' && (
            <ManualFlowForm
              isEditMode={isEditMode}
              setQuery={(next: StreamQueryKql) => setQueries([next])}
              query={queries[0]}
              setCanSave={(next: boolean) => {
                setCanSave(next);
              }}
              definition={definition}
            />
          )}
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiButton
            color="text"
            onClick={() => {
              onClose?.();
            }}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.addSignificantEventFlyout.cancelButtonLabel',
              { defaultMessage: 'Cancel' }
            )}
          </EuiButton>
          <EuiButton
            color="primary"
            fill
            iconType="plusInCircle"
            disabled={isSubmitting || !parsedQueries.success || !canSave}
            isLoading={isSubmitting}
            onClick={() => {
              if (!parsedQueries.success) {
                return;
              }

              setIsSubmitting(true);

              onSave(queries).finally(() => {
                setIsSubmitting(false);
              });
            }}
          >
            {isEditMode
              ? i18n.translate(
                  'xpack.streams.streamDetailView.addSignificantEventFlyout.updateButtonLabel',
                  { defaultMessage: 'Update' }
                )
              : i18n.translate(
                  'xpack.streams.streamDetailView.addSignificantEventFlyout.addButtonLabel',
                  { defaultMessage: 'Add' }
                )}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
