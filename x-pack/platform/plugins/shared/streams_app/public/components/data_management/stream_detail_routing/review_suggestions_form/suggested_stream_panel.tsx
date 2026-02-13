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
import { StreamNameFormRow, useChildStreamInput } from '../../../stream_name_form_row';
import { RoutingConditionEditor } from '../routing_condition_editor';
import { processCondition } from '../utils';
import { EditSuggestedRuleControls } from '../control_bars';

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
  onSave?: (suggestion: PartitionSuggestion) => void;
}) {
  const { changeSuggestionNameDebounced, changeSuggestionCondition, reviewSuggestedRule } =
    useStreamRoutingEvents();

  const isEditing = useStreamsRoutingSelector(
    (snapshot) =>
      snapshot.matches({ ready: { ingestMode: 'editingSuggestedRule' } }) &&
      snapshot.context.editingSuggestionIndex === index
  );
  const editedSuggestionForPanel = useStreamsRoutingSelector((snapshot) =>
    snapshot.matches({ ready: { ingestMode: 'editingSuggestedRule' } }) &&
    snapshot.context.editingSuggestionIndex === index
      ? snapshot.context.editedSuggestion
      : null
  );

  const currentSuggestion =
    isEditing && editedSuggestionForPanel ? editedSuggestionForPanel : partition;
  const matchRate = useMatchRate(definition, currentSuggestion);

  const selectedPreview = useStreamSamplesSelector((snapshot) => snapshot.context.selectedPreview);
  const isSelected = Boolean(
    selectedPreview &&
      selectedPreview.type === 'suggestion' &&
      selectedPreview.name === currentSuggestion.name
  );

  const conditionError = React.useMemo(() => {
    if (!isEditing) return undefined;

    const processedCondition = processCondition(currentSuggestion.condition);
    const isProcessedCondition = processedCondition ? isCondition(processedCondition) : true;

    if (!isProcessedCondition) {
      return i18n.translate('xpack.streams.streamDetailRouting.conditionRequiredError', {
        defaultMessage: 'Condition is required',
      });
    }

    return undefined;
  }, [isEditing, currentSuggestion.condition]);

  const handleNameChange = (name: string) => {
    if (!isEditing) return;
    changeSuggestionNameDebounced(name);
  };

  const handleConditionChange = (condition: any) => {
    if (!isEditing) return;
    changeSuggestionCondition(condition);
  };

  const { isStreamNameValid, setLocalStreamName, partitionName, prefix, helpText, errorMessage } =
    useChildStreamInput(currentSuggestion.name, false);

  if (isEditing) {
    return (
      <SelectablePanel paddingSize="m" isSelected={isSelected}>
        <EuiFlexGroup direction="column" gutterSize="m">
          <StreamNameFormRow
            onChange={handleNameChange}
            setLocalStreamName={setLocalStreamName}
            partitionName={partitionName}
            prefix={prefix}
            helpText={helpText}
            errorMessage={errorMessage}
            autoFocus
            isStreamNameValid={isStreamNameValid}
          />
          <RoutingConditionEditor
            status="enabled"
            condition={currentSuggestion.condition}
            onConditionChange={handleConditionChange}
            onStatusChange={() => {}}
            isSuggestionRouting={true}
          />
          <EditSuggestedRuleControls
            onSave={onSave ? () => onSave(currentSuggestion) : undefined}
            onAccept={() => reviewSuggestedRule(currentSuggestion.name || partition.name)}
            conditionError={conditionError}
            isStreamNameValid={isStreamNameValid}
          />
        </EuiFlexGroup>
      </SelectablePanel>
    );
  }

  return (
    <SelectablePanel paddingSize="m" isSelected={isSelected}>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h4 data-test-subj={`suggestionName-${currentSuggestion.name}`}>
              {currentSuggestion.name}
            </h4>
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
      <div data-test-subj={`suggestionConditionPanel-${currentSuggestion.name}`}>
        <ConditionPanel condition={currentSuggestion.condition} />
      </div>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween" wrap>
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
            data-test-subj={`suggestionPreviewButton-${currentSuggestion.name}`}
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
                data-test-subj={`suggestionRejectButton-${currentSuggestion.name}`}
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
                data-test-subj={`suggestionAcceptButton-${currentSuggestion.name}`}
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
