/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import type { FunctionComponent } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { EuiLiveAnnouncer } from '@elastic/eui';

import type { Processor } from '../../../../../common/types';

import type {
  EditorMode,
  FormValidityState,
  OnFormUpdateArg,
  OnUpdateHandlerArg,
  ContextValue,
  ContextValueState,
  ProcessorInternal,
} from '../types';

import { useProcessorsState, isOnFailureSelector } from '../processors_reducer';

import { deserialize } from '../deserialize';

import { serialize } from '../serialize';

import type { OnActionHandler } from '../components/processors_tree';

import type { OnSubmitHandler } from '../components';
import { ProcessorRemoveModal, PipelineProcessorsItemTooltip, ProcessorForm } from '../components';

import { getValue } from '../utils';

import { useTestPipelineContext } from './test_pipeline_context';
import { applyPendingMoveA11yEffects, buildMoveAnnouncement } from './move_a11y';

const PipelineProcessorsContext = createContext<ContextValue>({} as any);

export interface Props {
  value: {
    processors: Processor[];
    onFailure?: Processor[];
  };
  /**
   * Give users a way to react to this component opening a flyout
   */
  onFlyoutOpen: () => void;
  onUpdate: (arg: OnUpdateHandlerArg) => void;
  children?: React.ReactNode;
}

export const PipelineProcessorsContextProvider: FunctionComponent<Props> = ({
  value: { processors: originalProcessors, onFailure: originalOnFailureProcessors },
  onUpdate,
  onFlyoutOpen,
  children,
}) => {
  const initRef = useRef(false);
  const pendingFocusProcessorIdRef = useRef<string | null>(null);
  const pendingMoveAnnouncementRef = useRef<string | null>(null);
  const announcementToggleRef = useRef(false);

  const [mode, setMode] = useState<EditorMode>(() => ({
    id: 'idle',
  }));
  const deserializedResult = useMemo(
    () =>
      deserialize({
        processors: originalProcessors,
        onFailure: originalOnFailureProcessors,
      }),
    [originalProcessors, originalOnFailureProcessors]
  );
  const [processorsState, processorsDispatch] = useProcessorsState(deserializedResult);

  const { updateTestOutputPerProcessor, testPipelineData } = useTestPipelineContext();

  const {
    config: { documents },
  } = testPipelineData;

  useEffect(() => {
    if (initRef.current) {
      processorsDispatch({
        type: 'loadProcessors',
        payload: {
          newState: deserializedResult,
        },
      });
    } else {
      initRef.current = true;
    }
  }, [deserializedResult, processorsDispatch]);

  const { onFailure: onFailureProcessors, processors } = processorsState;
  const [moveAnnouncement, setMoveAnnouncement] = useState('');
  const latestProcessorsRef = useRef(processors);
  const latestOnFailureProcessorsRef = useRef(onFailureProcessors);

  useEffect(() => {
    latestProcessorsRef.current = processors;
    latestOnFailureProcessorsRef.current = onFailureProcessors;
  }, [processors, onFailureProcessors]);

  const [formState, setFormState] = useState<FormValidityState>({
    validate: () => Promise.resolve(true),
  });

  const onFormUpdate = useCallback<(arg: OnFormUpdateArg<any>) => void>(
    ({ isValid, validate }) => {
      setFormState({
        validate: async () => {
          if (isValid === undefined) {
            return validate();
          }
          return isValid;
        },
      });
    },
    [setFormState]
  );

  useEffect(() => {
    onUpdate({
      validate: async () => {
        const formValid = await formState.validate();
        return formValid && mode.id === 'idle';
      },
      getData: () =>
        serialize({
          pipeline: {
            onFailure: onFailureProcessors,
            processors,
          },
        }),
    });
  }, [processors, onFailureProcessors, onUpdate, formState, mode]);

  const onSubmit = useCallback<OnSubmitHandler>(
    (processorTypeAndOptions) => {
      switch (mode.id) {
        case 'creatingProcessor':
          processorsDispatch({
            type: 'addProcessor',
            payload: {
              processor: { ...processorTypeAndOptions },
              targetSelector: mode.arg.selector,
            },
          });
          break;
        case 'managingProcessor':
          // These are the option names we get back from our UI
          const knownOptionNames = [
            ...Object.keys(processorTypeAndOptions.options),
            // We manually add fields that we **don't** want to be treated as "unknownOptions"
            'internal_networks',
            'internal_networks_field',
            'value',
            'copy_from',
            'field',
            'keep',
            // input_output, target_field, and field_map are mutually exclusive inference processor
            // options. We only mark them as known when editing an inference processor so that
            // target_field (which is also used by other processor types) is not accidentally
            // stripped from unknownOptions when editing those other processors.
            ...(processorTypeAndOptions.type === 'inference'
              ? ['input_output', 'target_field', 'field_map']
              : []),
          ];

          // If the processor type is changed while editing, we need to ignore unkownOptions as they
          // will contain the fields from the previous processor resulting in the wrong request.
          const hasProcessorTypeChanged = mode.arg.processor.type !== processorTypeAndOptions.type;
          // The processor that we are updating may have options configured the UI does not know about
          const unknownOptions = hasProcessorTypeChanged
            ? {}
            : omit(mode.arg.processor.options, knownOptionNames);
          // In order to keep the options we don't get back from our UI, we merge the known and unknown options
          const updatedProcessorOptions = {
            ...processorTypeAndOptions.options,
            ...unknownOptions,
          };

          processorsDispatch({
            type: 'updateProcessor',
            payload: {
              processor: {
                ...mode.arg.processor,
                // Always prefer the newly selected processor type, as it might change during editing
                type: processorTypeAndOptions.type,
                options: updatedProcessorOptions,
              },
              selector: mode.arg.selector,
            },
          });

          break;
        default:
      }
    },
    [processorsDispatch, mode]
  );

  const onCloseSettingsForm = useCallback(() => {
    setMode({ id: 'idle' });
    setFormState({ validate: () => Promise.resolve(true) });
  }, [setFormState, setMode]);

  const onTreeAction = useCallback<OnActionHandler>(
    (action) => {
      switch (action.type) {
        case 'addProcessor':
          setMode({
            id: 'creatingProcessor',
            arg: { selector: action.payload.target, buttonRef: action.payload.buttonRef },
          });
          break;
        case 'move':
          {
            const latestProcessors = latestProcessorsRef.current;
            const latestOnFailureProcessors = latestOnFailureProcessorsRef.current;
            const result = buildMoveAnnouncement({
              source: action.payload.source,
              destination: action.payload.destination,
              processors: latestProcessors,
              onFailureProcessors: latestOnFailureProcessors,
            });

            if (result) {
              const { movedProcessorId, announcement } = result;
              // Ensure repeated moves are still announced if the text is the same.
              announcementToggleRef.current = !announcementToggleRef.current;
              pendingMoveAnnouncementRef.current = `${announcement}${
                announcementToggleRef.current ? '\u200B' : ''
              }`;
              pendingFocusProcessorIdRef.current = movedProcessorId;
            }
          }

          setMode({ id: 'idle' });
          processorsDispatch({
            type: 'moveProcessor',
            payload: action.payload,
          });
          break;
        case 'selectToMove':
          setMode({ id: 'movingProcessor', arg: action.payload.info });
          break;
        case 'cancelMove':
          setMode({ id: 'idle' });
          break;
      }
    },
    [processorsDispatch]
  );

  useEffect(() => {
    return applyPendingMoveA11yEffects({
      modeId: mode.id,
      pendingFocusProcessorIdRef,
      pendingMoveAnnouncementRef,
      setMoveAnnouncement,
    });
  }, [mode.id]);

  // Memoize the state object to ensure we do not trigger unnecessary re-renders and so
  // this object can be used safely further down the tree component tree.
  const state = useMemo<ContextValueState>(() => {
    return {
      editor: {
        mode,
        setMode,
      },
      processors: { state: processorsState, dispatch: processorsDispatch },
    };
  }, [mode, setMode, processorsState, processorsDispatch]);

  // Make a request to the simulate API and update the processor output
  // whenever the documents or processorsState changes (e.g., on move, update, delete)
  useEffect(() => {
    updateTestOutputPerProcessor(documents, processorsState);
  }, [documents, processorsState, updateTestOutputPerProcessor]);

  return (
    <PipelineProcessorsContext.Provider
      value={{
        onTreeAction,
        state,
      }}
    >
      {children}
      <div data-test-subj="pipelineProcessorsMoveAnnouncement">
        <EuiLiveAnnouncer clearAfterMs={false} aria-live="assertive">
          {moveAnnouncement}
        </EuiLiveAnnouncer>
      </div>
      {mode.id === 'movingProcessor' && (
        <PipelineProcessorsItemTooltip
          processor={getValue<ProcessorInternal>(mode.arg.selector, {
            processors,
            onFailure: onFailureProcessors,
          })}
        />
      )}

      {mode.id === 'managingProcessor' || mode.id === 'creatingProcessor' ? (
        <ProcessorForm
          isOnFailure={isOnFailureSelector(mode.arg.selector)}
          processor={mode.id === 'managingProcessor' ? mode.arg.processor : undefined}
          buttonRef={mode.arg.buttonRef}
          onOpen={onFlyoutOpen}
          onFormUpdate={onFormUpdate}
          onSubmit={onSubmit}
          onClose={onCloseSettingsForm}
        />
      ) : undefined}
      {mode.id === 'removingProcessor' && (
        <ProcessorRemoveModal
          selector={mode.arg.selector}
          processor={getValue<ProcessorInternal>(mode.arg.selector, {
            processors,
            onFailure: onFailureProcessors,
          })}
          onResult={({ confirmed, selector }) => {
            if (confirmed) {
              processorsDispatch({
                type: 'removeProcessor',
                payload: { selector },
              });
            }
            setMode({ id: 'idle' });
          }}
        />
      )}
    </PipelineProcessorsContext.Provider>
  );
};

export const usePipelineProcessorsContext = () => {
  const ctx = useContext(PipelineProcessorsContext);
  if (!ctx) {
    throw new Error(
      'usePipelineProcessorsContext can only be used inside of PipelineProcessorsContextProvider'
    );
  }
  return ctx;
};
