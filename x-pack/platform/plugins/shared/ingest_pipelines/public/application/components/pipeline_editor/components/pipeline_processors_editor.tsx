/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { memo, useMemo } from 'react';
import { ProcessorsTree } from '.';
import { usePipelineProcessorsContext } from '../context';
import type { ProcessorInternal } from '../types';
import { getValue } from '../utils';

import type { ON_FAILURE_STATE_SCOPE, PROCESSOR_STATE_SCOPE } from '../processors_reducer';
import { getProcessorDescriptor } from './shared';

export interface Props {
  stateSlice: typeof ON_FAILURE_STATE_SCOPE | typeof PROCESSOR_STATE_SCOPE;
}

export const PipelineProcessorsEditor: FunctionComponent<Props> = memo(
  function PipelineProcessorsEditor({ stateSlice }) {
    const {
      onTreeAction,
      state: { editor, processors },
    } = usePipelineProcessorsContext();
    const baseSelector = useMemo(() => [stateSlice], [stateSlice]);
    const movingProcessorLabel = useMemo(() => {
      if (editor.mode.id !== 'movingProcessor') return;
      try {
        const processor = getValue<ProcessorInternal>(editor.mode.arg.selector, processors.state);
        if (!processor) return;
        return getProcessorDescriptor(processor.type)?.label ?? processor.type;
      } catch {
        return;
      }
    }, [editor.mode, processors.state]);

    return (
      <ProcessorsTree
        baseSelector={baseSelector}
        processors={processors.state[stateSlice]}
        onAction={onTreeAction}
        movingProcessor={editor.mode.id === 'movingProcessor' ? editor.mode.arg : undefined}
        movingProcessorLabel={movingProcessorLabel}
      />
    );
  }
);
