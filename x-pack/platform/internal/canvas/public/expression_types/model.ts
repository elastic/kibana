/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { FunctionForm, FunctionFormProps } from './function_form';
import { Arg, View } from './types';

const NO_NEXT_EXP = 'no next expression';
const MISSING_MODEL_ARGS = 'missing model args';

interface ModelOwnProps {
  nextExpressionType?: View;
  requiresContext?: boolean;
  default?: string;
  resolveArgValue?: boolean;
  modelArgs: string[] | Arg[];
}

interface DataArg {
  arg: Arg;
}

export type ModelProps = ModelOwnProps & FunctionFormProps;

function getModelArgs(expressionType?: View) {
  if (!expressionType) {
    return NO_NEXT_EXP;
  }

  if (!expressionType?.modelArgs) {
    return MISSING_MODEL_ARGS;
  }

  return expressionType?.modelArgs.length > 0 ? expressionType?.modelArgs : MISSING_MODEL_ARGS;
}

export class Model extends FunctionForm {
  requiresContext?: boolean;

  constructor(props: ModelProps) {
    super(props);

    const defaultProps = { requiresContext: true };
    const { requiresContext } = props;

    merge(this, defaultProps, { requiresContext });
  }

  resolveArg(dataArg: DataArg, props: ModelProps) {
    // custom argument resolver
    // uses `modelArgs` from following expression to control which arguments get rendered
    const { nextExpressionType } = props;
    const modelArgs: Array<Arg | string> | string = getModelArgs(nextExpressionType);

    // if there is no following expression, or no modelArgs, argument is shown by default
    if (modelArgs === NO_NEXT_EXP || modelArgs === MISSING_MODEL_ARGS) {
      return { skipRender: false };
    }

    // if argument is missing from modelArgs, mark it as skipped
    const argName = dataArg?.arg?.name;
    const modelArg =
      typeof modelArgs !== 'string' &&
      modelArgs.find((arg) => {
        if (Array.isArray(arg)) {
          return arg[0] === argName;
        }
        return arg === argName;
      });

    return {
      label: Array.isArray(modelArg) ? modelArg[1]?.label : null,
      skipRender: !modelArg,
    };
  }
}
