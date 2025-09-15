/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  useFormContext,
  useFieldArray,
  UseFormRegisterReturn,
  FieldError,
  FieldErrorsImpl,
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
  EuiButtonEmptyProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DraftGrokExpression, GrokCollection } from '@kbn/grok-ui';
import { Expression } from '@kbn/grok-ui';
import useDebounce from 'react-use/lib/useDebounce';
import useObservable from 'react-use/lib/useObservable';
import { dynamic } from '@kbn/shared-ux-utility';
import { useStreamEnrichmentSelector } from '../../state_management/stream_enrichment_state_machine';
import { SortableList } from '../../sortable_list';
import { GrokFormState } from '../../types';
import { useAIFeatures } from './use_ai_features';

const GrokPatternAISuggestions = dynamic(() =>
  import('./grok_pattern_suggestion').then((mod) => ({ default: mod.GrokPatternAISuggestions }))
);

export const GrokPatternsEditor = () => {
  const {
    formState: { errors },
    register,
    setValue,
  } = useFormContext();

  const aiFeatures = useAIFeatures();

  const grokCollection = useStreamEnrichmentSelector(
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
      {aiFeatures ? (
        <GrokPatternAISuggestions
          aiFeatures={aiFeatures}
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
