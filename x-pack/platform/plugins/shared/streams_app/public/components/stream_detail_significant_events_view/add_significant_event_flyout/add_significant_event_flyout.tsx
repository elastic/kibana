/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql, Streams } from '@kbn/streams-schema';
import { streamQuerySchema } from '@kbn/streams-schema';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { useStreamSystems } from './common/use_steam_systems';
import { FlowSelector } from './flow_selector';
import { GeneratedFlowForm } from './generated_flow_form/generated_flow_form';
import { ManualFlowForm } from './manual_flow_form/manual_flow_form';
import type { Flow, SaveData } from './types';
import { defaultQuery } from './utils/default_query';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';

interface Props {
  onClose: () => void;
  definition: Streams.all.Definition;
  onSave: (data: SaveData) => Promise<void>;
  query?: StreamQueryKql;
}

export function AddSignificantEventFlyout({ query, onClose, definition, onSave }: Props) {
  const { euiTheme } = useEuiTheme();

  const isEditMode = !!query?.id;
  const [selectedFlow, setSelectedFlow] = useState<Flow | undefined>(
    isEditMode ? 'manual' : undefined
  );
  const flowRef = useRef<Flow | undefined>(selectedFlow);
  const [queries, setQueries] = useState<StreamQueryKql[]>([{ ...defaultQuery(), ...query }]);
  const [canSave, setCanSave] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<EuiComboBoxOptionOption<string>[]>([]);

  const parsedQueries = useMemo(() => {
    return streamQuerySchema.array().safeParse(queries);
  }, [queries]);

  useEffect(() => {
    if (flowRef.current !== selectedFlow) {
      flowRef.current = selectedFlow;
      setIsSubmitting(false);
      setCanSave(false);
      setQueries([defaultQuery()]);
    }
  }, [selectedFlow]);

  const { value: systemsData, loading: systemsLoading } = useStreamSystems(definition);

  const systems =
    systemsData?.systems.map((system) => ({
      name: system.name,
      filter: system.filter,
    })) || [];

  return (
    <EuiFlyout
      aria-labelledby="addSignificantEventFlyout"
      onClose={() => onClose()}
      size={isEditMode ? 's' : 'l'}
      type={isEditMode ? 'push' : 'overlay'}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            {isEditMode
              ? i18n.translate(
                  'xpack.streams.streamDetailView.addSignificantEventFlyout.editTitle',
                  { defaultMessage: 'Edit significant events' }
                )
              : i18n.translate(
                  'xpack.streams.streamDetailView.addSignificantEventFlyout.createTitle',
                  { defaultMessage: 'Add significant events' }
                )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        className={css`
          & .euiFlyoutBody__overflow {
            mask-image: none;
          }
          & .euiFlyoutBody__overflowContent {
            height: 100%;
            padding: 0;
          }
        `}
      >
        <EuiFlexGroup gutterSize="none" css={{ height: '100%' }}>
          {!isEditMode && (
            <EuiFlexItem
              grow={1}
              className={css`
                border-right: 1px solid ${euiTheme.colors.borderBaseSubdued};
                height: 100%;
              `}
            >
              <EuiPanel hasShadow={false} paddingSize="l">
                <EuiText>
                  <h4>
                    {i18n.translate(
                      'xpack.streams.streamDetailView.addSignificantEventFlyout.selectOptionLabel',
                      { defaultMessage: 'Select an option' }
                    )}
                  </h4>
                </EuiText>
                <EuiSpacer size="m" />
                <FlowSelector
                  isSubmitting={isSubmitting}
                  selected={selectedFlow}
                  updateSelected={(flow) => setSelectedFlow(flow)}
                />
                <EuiSpacer size="m" />
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.streams.addSignificantEventFlyout.euiFormRow.systemsLabel',
                    { defaultMessage: 'Systems' }
                  )}
                >
                  <EuiComboBox
                    singleSelection={true}
                    isLoading={systemsLoading}
                    aria-label={i18n.translate(
                      'xpack.streams.addSignificantEventFlyout.euiComboBox.selectSystemsLabel',
                      { defaultMessage: 'Select systems' }
                    )}
                    placeholder={i18n.translate(
                      'xpack.streams.addSignificantEventFlyout.euiComboBox.selectSystemsLabel',
                      { defaultMessage: 'Select systems' }
                    )}
                    options={systems.map((system) => ({ label: system.name, value: system.name }))}
                    selectedOptions={selectedSystem}
                    onChange={(newOpts) => {
                      setSelectedSystem(newOpts);
                    }}
                    isClearable={true}
                  />
                </EuiFormRow>
              </EuiPanel>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={2}>
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              justifyContent="spaceBetween"
              css={{ height: '100%' }}
            >
              <EuiFlexItem grow={1}>
                <EuiPanel hasShadow={false} paddingSize="l">
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                    <EuiFlexItem grow={false} />
                    <EuiFlexItem grow={false}>
                      <StreamsAppSearchBar showDatePicker />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="m" />

                  {selectedFlow === 'manual' && (
                    <ManualFlowForm
                      isSubmitting={isSubmitting}
                      setQuery={(next: StreamQueryKql) => setQueries([next])}
                      query={queries[0]}
                      setCanSave={(next: boolean) => {
                        setCanSave(next);
                      }}
                      definition={definition}
                      systems={systems}
                    />
                  )}

                  {selectedFlow === 'ai' && (
                    <GeneratedFlowForm
                      selectedSystem={systemsData?.systems.find(
                        (s) => s.name === selectedSystem[0]?.value
                      )}
                      isSubmitting={isSubmitting}
                      definition={definition}
                      setQueries={(next: StreamQueryKql[]) => {
                        setQueries(next);
                      }}
                      setCanSave={(next: boolean) => {
                        setCanSave(next);
                      }}
                    />
                  )}
                </EuiPanel>
              </EuiFlexItem>

              <EuiFlexItem
                grow={false}
                css={{
                  backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                  padding: euiTheme.size.l,
                }}
              >
                <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
                  <EuiButtonEmpty
                    aria-label={i18n.translate(
                      'xpack.streams.streamDetailView.addSignificantEventFlyout.cancelButtonLabel',
                      { defaultMessage: 'Cancel' }
                    )}
                    color="primary"
                    onClick={() => onClose()}
                    disabled={isSubmitting}
                  >
                    {i18n.translate(
                      'xpack.streams.streamDetailView.addSignificantEventFlyout.cancelButtonLabel',
                      { defaultMessage: 'Cancel' }
                    )}
                  </EuiButtonEmpty>
                  <EuiButton
                    color="primary"
                    fill
                    disabled={isSubmitting || !parsedQueries.success || !canSave}
                    isLoading={isSubmitting}
                    onClick={() => {
                      setIsSubmitting(true);

                      switch (selectedFlow) {
                        case 'manual':
                          onSave({
                            type: 'single',
                            query: queries[0],
                            isUpdating: isEditMode,
                          }).finally(() => setIsSubmitting(false));
                          break;
                        case 'ai':
                          onSave({ type: 'multiple', queries }).finally(() =>
                            setIsSubmitting(false)
                          );
                          break;
                      }
                    }}
                  >
                    {selectedFlow === 'manual'
                      ? isEditMode
                        ? i18n.translate(
                            'xpack.streams.streamDetailView.addSignificantEventFlyout.updateButtonLabel',
                            { defaultMessage: 'Update event' }
                          )
                        : i18n.translate(
                            'xpack.streams.streamDetailView.addSignificantEventFlyout.addButtonLabel',
                            { defaultMessage: 'Add event' }
                          )
                      : i18n.translate(
                          'xpack.streams.streamDetailView.addSignificantEventFlyout.addSelectedButtonLabel',
                          { defaultMessage: 'Add selected' }
                        )}
                  </EuiButton>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
