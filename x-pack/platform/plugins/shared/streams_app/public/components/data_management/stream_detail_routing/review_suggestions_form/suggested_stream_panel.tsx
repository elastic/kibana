/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
  EuiIcon,
  EuiLoadingSpinner,
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { type Streams } from '@kbn/streams-schema';
import { isCondition } from '@kbn/streamlang';
import type { PartitionSuggestion } from './use_review_suggestions_form';
import { useMatchRate } from './use_match_rate';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
  useStreamSamplesSelector,
} from '../state_management/stream_routing_state_machine/use_stream_routing';
import { SelectablePanel } from './selectable_panel';
import { ConditionPanel, VerticalRule } from '../../shared';
import { StreamNameFormRow } from '../stream_name_form_row';
import { RoutingConditionEditor } from '../routing_condition_editor';
import { processCondition } from '../utils';

export function SuggestedStreamPanel({
  definition,
  partition,
  onDismiss,
  onPreview,
  index,
  onEdit,
  onSave,
}: {
  definition: Streams.WiredStream.GetResponse;
  partition: PartitionSuggestion;
  onDismiss(): void;
  onPreview(toggle: boolean): void;
  index: number;
  onEdit(index: number, suggestion: PartitionSuggestion): void;
  onSave?: () => void;
}) {
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);
  const {
    changeSuggestionName,
    changeSuggestionCondition,
    reviewSuggestedRule,
    cancelChanges,
    saveEditedSuggestion,
  } = useStreamRoutingEvents();

  const [nameError, setNameError] = React.useState<string | undefined>(undefined);
  const [conditionError, setConditionError] = React.useState<string | undefined>(undefined);

  const editedSuggestion = routingSnapshot.context.editedSuggestion;
  const isEditing =
    routingSnapshot.matches({ ready: 'editingSuggestedRule' }) &&
    routingSnapshot.context.editingSuggestionIndex === index;

  // Use edited suggestion when editing, otherwise use original partition
  const currentSuggestion = isEditing && editedSuggestion ? editedSuggestion : partition;
  const matchRate = useMatchRate(definition, currentSuggestion);

  const selectedPreview = useStreamSamplesSelector((snapshot) => snapshot.context.selectedPreview);
  const isSelected = Boolean(
    selectedPreview &&
      selectedPreview.type === 'suggestion' &&
      selectedPreview.name === currentSuggestion.name
  );

  const handleNameChange = (name: string) => {
    if (!isEditing) return;
    const isDuplicateName = routingSnapshot.context.routing.some((r) => r.destination === name);

    if (isDuplicateName) {
      setNameError(
        i18n.translate('xpack.streams.streamDetailRouting.nameConflictError', {
          defaultMessage: 'A stream with this name already exists',
        })
      );
    } else {
      setNameError(undefined);
    }

    changeSuggestionName(name);
  };

  const handleConditionChange = (condition: any) => {
    if (!isEditing) return;
    const processedCondition = processCondition(condition);
    const isProcessedCondition = processedCondition ? isCondition(processedCondition) : true;

    if (!isProcessedCondition) {
      setConditionError(
        i18n.translate('xpack.streams.streamDetailRouting.conditionRequiredError', {
          defaultMessage: 'Condition is required',
        })
      );
    } else {
      setConditionError(undefined);
    }

    changeSuggestionCondition(condition);
  };

  if (isEditing) {
    return (
      <SelectablePanel paddingSize="m" isSelected={isSelected}>
        <EuiFlexGroup direction="column" gutterSize="m">
          <StreamNameFormRow
            value={currentSuggestion.name}
            onChange={handleNameChange}
            autoFocus
            error={nameError}
            isInvalid={!!nameError}
          />
          <RoutingConditionEditor
            status="enabled"
            condition={currentSuggestion.condition}
            onConditionChange={handleConditionChange}
            onStatusChange={() => {}}
            isSuggestionRouting={true}
          />
          <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={cancelChanges}
                aria-label={i18n.translate('xpack.streams.streamDetailRouting.cancel', {
                  defaultMessage: 'Cancel',
                })}
              >
                {i18n.translate('xpack.streams.streamDetailRouting.cancel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="m" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    isDisabled={!!nameError || !!conditionError}
                    onClick={() => {
                      if (onSave) {
                        onSave();
                      }
                      saveEditedSuggestion();
                    }}
                  >
                    {i18n.translate('xpack.streams.streamDetailRouting.update', {
                      defaultMessage: 'Update',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    isDisabled={!!nameError || !!conditionError}
                    onClick={() => {
                      if (isEditing && onSave) {
                        onSave();
                      }
                      reviewSuggestedRule(currentSuggestion.name || partition.name);
                    }}
                    fill
                  >
                    {i18n.translate(
                      'xpack.streams.streamDetailRouting.suggestedStreamPanel.accept',
                      {
                        defaultMessage: 'Update & Accept',
                      }
                    )}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </SelectablePanel>
    );
  }

  return (
    <SelectablePanel paddingSize="m" isSelected={isSelected}>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h4>{currentSuggestion.name}</h4>
          </EuiTitle>
        </EuiFlexItem>
        {matchRate.loading ? (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
        ) : matchRate.value !== undefined ? (
          <>
            <EuiIcon type="check" color="success" size="s" />
            <EuiText size="s" color="success">
              {matchRate.value}
            </EuiText>
          </>
        ) : null}
        <EuiFlexItem grow={false}>
          <VerticalRule />
        </EuiFlexItem>
        <EuiButtonIcon
          iconType="pencil"
          onClick={() => onEdit(index, currentSuggestion)}
          aria-label={i18n.translate('xpack.streams.streamDetailRouting.edit', {
            defaultMessage: 'Edit',
          })}
          data-test-subj={`suggestionEditButton-${currentSuggestion.name}`}
        />
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <ConditionPanel condition={currentSuggestion.condition} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType={isSelected ? 'eyeClosed' : 'eye'}
            isSelected={isSelected}
            size="s"
            onClick={() => onPreview(!isSelected)}
            aria-label={i18n.translate(
              'xpack.streams.streamDetailRouting.suggestedStreamPanel.preview',
              {
                defaultMessage: 'Preview',
              }
            )}
          >
            {i18n.translate('xpack.streams.streamDetailRouting.suggestedStreamPanel.preview', {
              defaultMessage: 'Preview',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={onDismiss}
                aria-label={i18n.translate(
                  'xpack.streams.streamDetailRouting.suggestedStreamPanel.dismiss',
                  {
                    defaultMessage: 'Reject',
                  }
                )}
              >
                {i18n.translate('xpack.streams.streamDetailRouting.suggestedStreamPanel.dismiss', {
                  defaultMessage: 'Reject',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="check"
                size="s"
                onClick={() => reviewSuggestedRule(currentSuggestion.name || partition.name)}
                fill
              >
                {i18n.translate('xpack.streams.streamDetailRouting.suggestedStreamPanel.accept', {
                  defaultMessage: 'Accept',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </SelectablePanel>
  );
}
