/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';

import { usePipelineProcessorsContext } from '../../context';

import type { Props as ViewComponentProps } from './pipeline_processors_editor_item';
import { PipelineProcessorsEditorItem as ViewComponent } from './pipeline_processors_editor_item';

type Props = Omit<ViewComponentProps, 'editor' | 'processorsDispatch'>;

export const PipelineProcessorsEditorItem: FunctionComponent<Props> = (props) => {
  const { state } = usePipelineProcessorsContext();

  return (
    <ViewComponent
      {...props}
      editor={state.editor}
      processorsDispatch={state.processors.dispatch}
    />
  );
};
