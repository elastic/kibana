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
  UseFormSetValue,
  FieldArrayWithId,
  FieldValues,
} from 'react-hook-form';
import {
  DragDropContextProps,
  EuiFormRow,
  EuiPanel,
  EuiButtonEmpty,
  EuiDraggable,
  EuiFlexGroup,
  EuiIcon,
  EuiButtonIcon,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonEmptyProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DraftGrokExpression, GrokCollection } from '@kbn/grok-ui';
import { Expression } from '@kbn/grok-ui';
import useDebounce from 'react-use/lib/useDebounce';
import useObservable from 'react-use/lib/useObservable';
import { STREAMS_TIERED_AI_FEATURE } from '@kbn/streams-plugin/common';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsEnrichmentSelector } from '../../state_management/stream_enrichment_state_machine';
import { SortableList } from '../../sortable_list';
import { GrokPatternSuggestion } from './grok_pattern_suggestion';
import { GeneratePatternButton, AdditionalChargesCallout } from './generate_pattern_button';
import { useGrokPatternSuggestion } from './use_grok_pattern_suggestion';
import { useSimulatorSelector } from '../../state_management/stream_enrichment_state_machine';
import { selectPreviewDocuments } from '../../state_management/simulation_state_machine/selectors';
import { useStreamDetail } from '../../../../../hooks/use_stream_detail';
import { GrokFormState, ProcessorFormState } from '../../types';
import { useAIFeatures } from './use_ai_features';

export const GrokPatternsEditor = () => {
  const { core } = useKibana();
  const {
    formState: { errors },
    register,
    setValue,
  } = useFormContext();

  const isAIAvailableForTier = core.pricing.isFeatureAvailable(STREAMS_TIERED_AI_FEATURE.id);

  const grokCollection = useStreamsEnrichmentSelector(
    (machineState) => machineState.context.grokCollection
  );

  const { fields, append, remove, move } = useFieldArray<Pick<GrokFormState, 'patterns'>>({
    name: 'patterns',
  });

  const fieldsWithError = fields.map((field, id) => {
    return {
      draftGrokExpression: field,
      error: (errors.patterns as unknown as FieldErrorsImpl[])?.[id]?.value as
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
    append(new DraftGrokExpression(grokCollection, ''));
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
                key={field.draftGrokExpression.id}
                field={field}
                idx={idx}
                onRemove={getRemovePatternHandler(idx)}
                inputProps={register(`patterns.${idx}.value`, {
                  required: i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokEditorRequiredError',
                    { defaultMessage: 'A pattern is required.' }
                  ),
                })}
                grokCollection={grokCollection}
                setValue={setValue}
              />
            ))}
          </SortableList>
        </EuiPanel>
      </EuiFormRow>
      {isAIAvailableForTier ? (
        <GrokPatternAISuggestions
          grokCollection={grokCollection}
          setValue={setValue}
          onAddPattern={handleAddPattern}
        />
      ) : (
        <AddPatternButton onClick={handleAddPattern} />
      )}
    </>
  );
};

const GrokPatternAISuggestions = ({
  grokCollection,
  setValue,
  onAddPattern,
}: {
  grokCollection: GrokCollection;
  setValue: UseFormSetValue<FieldValues>;
  onAddPattern: () => void;
}): React.ReactElement => {
  const {
    definition: { stream },
  } = useStreamDetail();

  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewDocuments(snapshot.context)
  );

  const aiFeatures = useAIFeatures();
  const [suggestionsState, refreshSuggestions] = useGrokPatternSuggestion();

  const fieldValue = useWatch<ProcessorFormState, 'field'>({ name: 'field' });
  const isValidField = useMemo(() => {
    return Boolean(
      fieldValue &&
        previewDocuments.some(
          (sample) => sample[fieldValue] && typeof sample[fieldValue] === 'string'
        )
    );
  }, [previewDocuments, fieldValue]);

  if (suggestionsState.value && suggestionsState.value[0]) {
    return (
      <GrokPatternSuggestion
        suggestion={suggestionsState.value[0]}
        onAccept={() => {
          const [suggestion] = suggestionsState.value ?? [];
          if (suggestion) {
            setValue(
              'patterns',
              suggestion.grokProcessor.patterns.map(
                (value) => new DraftGrokExpression(grokCollection, value)
              )
            );
            setValue('pattern_definitions', suggestion.grokProcessor.pattern_definitions);
          }
          refreshSuggestions(null);
        }}
        onDismiss={() => refreshSuggestions(null)}
      />
    );
  }

  return (
    <>
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
          <AddPatternButton onClick={onAddPattern} isDisabled={suggestionsState.loading} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {aiFeatures &&
        aiFeatures.isManagedAIConnector &&
        !aiFeatures.hasAcknowledgedAdditionalCharges && (
          <>
            <EuiSpacer size="s" />
            <AdditionalChargesCallout aiFeatures={aiFeatures} />
          </>
        )}
    </>
  );
};

const AddPatternButton = (props: EuiButtonEmptyProps) => {
  return (
    <EuiButtonEmpty
      data-test-subj="streamsAppGrokPatternsEditorAddPatternButton"
      flush="left"
      size="s"
      {...props}
    >
      {i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokEditor.addPattern',
        { defaultMessage: 'Add pattern' }
      )}
    </EuiButtonEmpty>
  );
};

interface DraggablePatternInputProps {
  field: {
    draftGrokExpression: FieldArrayWithId<Pick<GrokFormState, 'patterns'>, 'patterns', 'id'>;
  } & {
    error?: FieldError;
  };
  idx: number;
  inputProps: UseFormRegisterReturn<`patterns.${number}.value`>;
  onRemove: ((idx: number) => void) | null;
  grokCollection: GrokCollection;
  setValue: UseFormSetValue<FieldValues>;
}

const DraggablePatternInput = ({
  field,
  idx,
  inputProps,
  onRemove,
  grokCollection,
  setValue,
}: DraggablePatternInputProps) => {
  const { error, draftGrokExpression } = field;

  const isInvalid = Boolean(error);

  const expression = useObservable(draftGrokExpression.getExpression$());

  useDebounce(
    () => {
      setValue(`patterns.${idx}.value`, field.draftGrokExpression);
    },
    300,
    [expression]
  );

  return (
    <EuiDraggable
      index={idx}
      spacing="m"
      draggableId={draftGrokExpression.id}
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
            <EuiFlexItem grow={false}>
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
            </EuiFlexItem>
            <EuiFlexItem>
              <Expression
                draftGrokExpression={field.draftGrokExpression}
                grokCollection={grokCollection}
                dataTestSubj="streamsAppPatternExpression"
              />
            </EuiFlexItem>
            {onRemove && (
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
            )}
          </EuiFlexGroup>
        </EuiFormRow>
      )}
    </EuiDraggable>
  );
};
