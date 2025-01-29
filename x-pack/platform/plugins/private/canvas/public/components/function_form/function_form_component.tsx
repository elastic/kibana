/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { RenderArgData } from '../../expression_types/types';

type FunctionFormComponentProps = RenderArgData;

export const FunctionFormComponent: FunctionComponent<FunctionFormComponentProps> = (props) => {
  const passedProps = {
    name: props.name,
    removable: props.removable,
    argResolver: props.argResolver,
    args: props.args,
    id: props.id,
    nestedFunctionsArgs: props.nestedFunctionsArgs,
    argType: props.argType,
    argTypeDef: props.argTypeDef,
    filterGroups: props.filterGroups,
    context: props.context,
    expressionType: props.expressionType,
    nextArgType: props.nextArgType,
    nextExpressionType: props.nextExpressionType,
    onAssetAdd: props.onAssetAdd,
    onValueAdd: props.onValueAdd,
    onValueChange: props.onValueChange,
    onValueRemove: props.onValueRemove,
    onContainerRemove: props.onContainerRemove,
    updateContext: props.updateContext,
  };

  return <div className="canvasFunctionForm">{props.expressionType.render(passedProps)}</div>;
};
