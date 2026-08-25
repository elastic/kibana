/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import type { FunctionFormProps } from './function_form';
import { FunctionForm } from './function_form';
import type { Arg } from './types';

interface ViewOwnProps {
  modelArgs: string[] | Arg[];
  requiresContext?: boolean;
  default?: string;
  resolveArgValue?: boolean;
}

export type ViewProps = ViewOwnProps & FunctionFormProps;

export class View extends FunctionForm {
  modelArgs: string[] | Arg[] = [];
  requiresContext?: boolean;

  constructor(props: ViewProps) {
    super(props);
    const { help, modelArgs, requiresContext } = props;
    const defaultProps = {
      help: `Element: ${props.name}`,
      requiresContext: true,
    };

    merge(this, defaultProps, { help, modelArgs: modelArgs || [], requiresContext });

    if (!Array.isArray(this.modelArgs)) {
      throw new Error(`${this.name} element is invalid, modelArgs must be an array`);
    }
  }
}
