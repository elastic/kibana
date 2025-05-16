/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { Ast } from '@kbn/interpreter';
import deepEqual from 'react-fast-compare';
import { ExpressionAstExpression, ExpressionValue } from '@kbn/expressions-plugin/common';
import { findExpressionType } from '../../lib/find_expression_type';

// @ts-expect-error unconverted action function
import { setAsset } from '../../state/actions/assets';
import {
  fetchContext,
  setArgument as setArgumentValue,
  addArgumentValue,
  deleteArgumentAtIndex,
  // @ts-expect-error untyped local
} from '../../state/actions/elements';
import {
  getSelectedElement,
  getSelectedPage,
  getContextForIndex,
  getGlobalFilterGroups,
  getFullWorkpadPersisted,
} from '../../state/selectors/workpad';
import { getAssets } from '../../state/selectors/assets';
// @ts-expect-error unconverted lib
import { findExistingAsset } from '../../lib/find_existing_asset';
import { FunctionForm as Component } from './function_form';
import { Args, ArgType, ArgTypeDef } from '../../expression_types/types';
import { State, ExpressionContext, CanvasElement, AssetType } from '../../../types';
import { createAsset, notifyError } from '../../lib/assets';
import { getCanvasWorkpadService } from '../../services/canvas_workpad_service';

interface FunctionFormProps {
  name: string;
  argResolver: (ast: ExpressionAstExpression) => Promise<ExpressionValue>;
  args: Args;
  nestedFunctionsArgs: Args;
  argType: ArgType;
  argTypeDef: ArgTypeDef;
  expressionIndex: number;
  nextArgType?: ArgType;
  path: string;
  parentPath: string;
  removable?: boolean;
}

export const FunctionForm: React.FunctionComponent<FunctionFormProps> = (props) => {
  const { expressionIndex, ...restProps } = props;
  const { nextArgType, path, parentPath, argType } = restProps;

  const dispatch = useDispatch();
  const context = useSelector<State, ExpressionContext>(
    (state) => getContextForIndex(state, parentPath, expressionIndex),
    deepEqual
  );
  const element = useSelector<State, CanvasElement | undefined>(
    (state) => getSelectedElement(state),
    deepEqual
  );
  const pageId = useSelector<State, string>((state) => getSelectedPage(state), shallowEqual);
  const assets = useSelector<State, State['assets']>((state) => getAssets(state), shallowEqual);
  const filterGroups = useSelector<State, string[]>(
    (state) => getGlobalFilterGroups(state),
    shallowEqual
  );

  const workpad = useSelector((state: State) => getFullWorkpadPersisted(state));

  const addArgument = useCallback(
    (argName: string, argValue: string | Ast | null) => () => {
      dispatch(
        addArgumentValue({ elementId: element?.id, pageId, argName, value: argValue, path })
      );
    },
    [dispatch, element?.id, pageId, path]
  );

  const updateContext = useCallback(() => {
    return dispatch(fetchContext(expressionIndex, element, false, parentPath));
  }, [dispatch, element, expressionIndex, parentPath]);

  const setArgument = useCallback(
    (argName: string, valueIndex: number) => (value: string | Ast | null) => {
      dispatch(
        setArgumentValue({ elementId: element?.id, pageId, argName, value, valueIndex, path })
      );
    },
    [dispatch, element?.id, pageId, path]
  );

  const deleteArgument = useCallback(
    (argName: string, argIndex: number) => () => {
      dispatch(deleteArgumentAtIndex({ element, pageId, argName, argIndex, path }));
    },
    [dispatch, element, pageId, path]
  );

  const deleteParentArgument = useCallback(() => {
    dispatch(deleteArgumentAtIndex({ element, pageId, path: parentPath }));
  }, [dispatch, element, pageId, parentPath]);

  const onAssetAddDispatch = useCallback(
    (type: AssetType['type'], content: AssetType['value']) => {
      // make the ID here and pass it into the action
      const asset = createAsset(type, content);

      return getCanvasWorkpadService()
        .updateAssets(workpad.id, { ...workpad.assets, [asset.id]: asset })
        .then((res) => {
          dispatch(setAsset(asset));
          // then return the id, so the caller knows the id that will be created
          return asset.id;
        })
        .catch((error) => notifyError(error));
    },
    [dispatch, workpad.assets, workpad.id]
  );

  const onAssetAdd = useCallback(
    (type: AssetType['type'], content: AssetType['value']) => {
      const existingId = findExistingAsset(type, content, assets);
      if (existingId) {
        return existingId;
      }
      return onAssetAddDispatch(type, content);
    },
    [assets, onAssetAddDispatch]
  );

  return (
    <Component
      {...restProps}
      id={path}
      context={context}
      filterGroups={filterGroups}
      expressionType={findExpressionType(argType)}
      nextExpressionType={nextArgType ? findExpressionType(nextArgType) : undefined}
      onValueAdd={addArgument}
      updateContext={updateContext}
      onValueChange={setArgument}
      onValueRemove={deleteArgument}
      onContainerRemove={deleteParentArgument}
      onAssetAdd={onAssetAdd}
    />
  );
};
