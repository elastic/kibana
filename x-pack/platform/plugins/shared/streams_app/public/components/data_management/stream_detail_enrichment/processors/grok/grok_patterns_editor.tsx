/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  useFormContext,
  useFieldArray,
  UseFormRegisterReturn,
  FieldError,
  FieldErrorsImpl,
  useWatch,
} from 'react-hook-form';
import {
  DragDropContextProps,
  EuiFormRow,
  EuiPanel,
  EuiButtonEmpty,
  EuiDraggable,
  EuiFlexGroup,
  EuiIcon,
  EuiTextArea,
  EuiButtonIcon,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEuiTheme, useEuiFontSize } from '@elastic/eui';
import { SortableList } from '../../sortable_list';
import { GrokPatternSuggestion } from './grok_pattern_suggestion';
import { GeneratePatternButton } from './generate_pattern_button';
import { useGrokPatternSuggestion } from './use_grok_pattern_suggestion';
import { useSimulatorSelector } from '../../state_management/stream_enrichment_state_machine';
import { selectPreviewDocuments } from '../../state_management/simulation_state_machine/selectors';
import { useStreamDetail } from '../../../../../hooks/use_stream_detail';
import { GrokFormState, ProcessorFormState } from '../../types';
import { useAIFeatures } from './use_ai_features';

export const GrokPatternsEditor = () => {
  const form = useFormContext<GrokFormState>();
  const { fields, append, remove, move } = useFieldArray<Pick<GrokFormState, 'patterns'>>({
    name: 'patterns',
  });
  const {
    definition: { stream },
  } = useStreamDetail();
  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewDocuments(snapshot.context)
  );
  const fieldValue = useWatch<ProcessorFormState, 'field'>({ name: 'field' });
  const isValidField = useMemo(() => {
    return Boolean(
      fieldValue &&
        previewDocuments.some(
          (sample) => sample[fieldValue] && typeof sample[fieldValue] === 'string'
        )
    );
  }, [previewDocuments, fieldValue]);
  const aiFeatures = useAIFeatures();
  const [suggestionsState, refreshSuggestions] = useGrokPatternSuggestion();

  const fieldsWithError = fields.map((field, id) => {
    return {
      ...field,
      error: (form.formState.errors.patterns as unknown as FieldErrorsImpl[])?.[id]?.value as
        | FieldError
        | undefined,
    };
  });

  const handlerPatternDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    if (source && destination) {
      move(source.index, destination.index);
    }
  };

  const handleAddPattern = () => {
    append({ value: '' });
  };

  const getRemovePatternHandler = (id: number) => (fields.length > 1 ? () => remove(id) : null);

  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokEditorLabel',
          { defaultMessage: 'Grok patterns' }
        )}
      >
        <EuiPanel color="subdued" paddingSize="none">
          <SortableList onDragItem={handlerPatternDrag}>
            {fieldsWithError.map((field, idx) => (
              <DraggablePatternInput
                key={field.id}
                field={field}
                idx={idx}
                onRemove={getRemovePatternHandler(idx)}
                inputProps={form.register(`patterns.${idx}.value`, {
                  required: i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokEditorRequiredError',
                    { defaultMessage: 'A pattern is required.' }
                  ),
                })}
              />
            ))}
          </SortableList>
        </EuiPanel>
      </EuiFormRow>
      {suggestionsState.value && suggestionsState.value[0] ? (
        <GrokPatternSuggestion
          suggestion={suggestionsState.value[0]}
          onAccept={() => {
            const [suggestion] = suggestionsState.value ?? [];
            if (suggestion) {
              form.setValue(
                'patterns',
                suggestion.grokProcessor.patterns.map((value) => ({ value }))
              );
              form.setValue('pattern_definitions', suggestion.grokProcessor.pattern_definitions);
            }
            refreshSuggestions(null);
          }}
          onDismiss={() => refreshSuggestions(null)}
        />
      ) : (
        <EuiFlexGroup gutterSize="l" alignItems="center">
          {aiFeatures && (
            <EuiFlexItem grow={false}>
              <GeneratePatternButton
                aiFeatures={aiFeatures}
                onClick={(connectorId) =>
                  refreshSuggestions({
                    connectorId,
                    streamName: stream.name,
                    samples: previewDocuments,
                    fieldName: fieldValue,
                  })
                }
                isLoading={suggestionsState.loading}
                isDisabled={!isValidField}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="streamsAppGrokPatternsEditorAddPatternButton"
              onClick={handleAddPattern}
              flush="left"
              size="s"
              isDisabled={suggestionsState.loading}
            >
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokEditor.addPattern',
                { defaultMessage: 'Add pattern' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
};

interface DraggablePatternInputProps {
  field: GrokFormState['patterns'][number] & { id: string; error?: FieldError };
  idx: number;
  inputProps: UseFormRegisterReturn<`patterns.${number}.value`>;
  onRemove: ((idx: number) => void) | null;
}

const DraggablePatternInput = ({
  field,
  idx,
  inputProps,
  onRemove,
}: DraggablePatternInputProps) => {
  const { euiTheme } = useEuiTheme();
  const fontSize = useEuiFontSize('xs').fontSize;
  const { ref, ...inputPropsWithoutRef } = inputProps;
  const { error, id } = field;

  const isInvalid = Boolean(error);

  if (!onRemove) {
    return (
      <EuiFormRow isInvalid={isInvalid} error={error?.message}>
        <EuiTextArea
          data-test-subj="streamsAppDraggablePatternInputFieldText"
          {...inputPropsWithoutRef}
          inputRef={ref}
          compressed
          isInvalid={isInvalid}
          css={{
            fontFamily: euiTheme.font.familyCode,
            fontSize,
          }}
        />
      </EuiFormRow>
    );
  }

  return (
    <EuiDraggable
      index={idx}
      spacing="m"
      draggableId={id}
      hasInteractiveChildren
      customDragHandle
      css={{
        paddingLeft: 0,
        paddingRight: 0,
      }}
    >
      {(provided) => (
        <EuiFormRow isInvalid={isInvalid} error={error?.message}>
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
            <EuiPanel
              color="transparent"
              paddingSize="s"
              {...provided.dragHandleProps}
              aria-label={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokEditor.dragHandleLabel',
                { defaultMessage: 'Drag Handle' }
              )}
            >
              <EuiIcon type="grab" />
            </EuiPanel>
            <EuiTextArea
              data-test-subj="streamsAppDraggablePatternInputFieldText"
              {...inputPropsWithoutRef}
              inputRef={ref}
              compressed
              isInvalid={isInvalid}
              css={{
                fontFamily: euiTheme.font.familyCode,
                fontSize,
              }}
            />
            <EuiButtonIcon
              data-test-subj="streamsAppDraggablePatternInputButton"
              iconType="minusInCircle"
              color="danger"
              onClick={() => onRemove(idx)}
              aria-label={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokEditor.removePattern',
                { defaultMessage: 'Remove grok pattern' }
              )}
            />
          </EuiFlexGroup>
        </EuiFormRow>
      )}
    </EuiDraggable>
  );
};
