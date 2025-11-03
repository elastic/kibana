/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { merge } from 'lodash';
import type { FunctionFormProps } from './function_form';
import { FunctionForm } from './function_form';

export type TransformProps = { requiresContext: boolean } & FunctionFormProps;

export class Transform extends FunctionForm {
  requiresContext?: boolean;

  constructor(props: TransformProps) {
    super(props);
    const { requiresContext } = props;
    const defaultProps = {
      requiresContext: true,
    };

    merge(this, defaultProps, { requiresContext });
  }
}
