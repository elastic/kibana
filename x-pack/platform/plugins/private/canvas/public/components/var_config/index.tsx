/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import copy from 'copy-to-clipboard';
import { i18n } from '@kbn/i18n';

import { VarConfig as ChildComponent } from './var_config';
import { useNotifyService } from '../../services';
import type { CanvasVariable } from '../../../types';

const strings = {
  getCopyNotificationDescription: () =>
    i18n.translate('xpack.canvas.varConfig.copyNotificationDescription', {
      defaultMessage: 'Variable syntax copied to clipboard',
    }),
  getDeleteNotificationDescription: () =>
    i18n.translate('xpack.canvas.varConfig.deleteNotificationDescription', {
      defaultMessage: 'Variable successfully deleted',
    }),
};

interface Props {
  variables: CanvasVariable[];
  setVariables: (variables: CanvasVariable[]) => void;
}

export const VarConfig: FC<Props> = ({ variables, setVariables }) => {
  const { success } = useNotifyService();
  const onDeleteVar = (v: CanvasVariable) => {
    const index = variables.findIndex((targetVar: CanvasVariable) => {
      return targetVar.name === v.name;
    });
    if (index !== -1) {
      const newVars = [...variables];
      newVars.splice(index, 1);
      setVariables(newVars);
      success(strings.getDeleteNotificationDescription());
    }
  };

  const onCopyVar = (v: CanvasVariable) => {
    const snippetStr = `{var "${v.name}"}`;
    copy(snippetStr, { debug: true });
    success(strings.getCopyNotificationDescription());
  };

  const onAddVar = (v: CanvasVariable) => {
    setVariables([...variables, v]);
  };

  const onEditVar = (oldVar: CanvasVariable, newVar: CanvasVariable) => {
    const existingVarIndex = variables.findIndex((v) => oldVar.name === v.name);

    const newVars = [...variables];
    newVars[existingVarIndex] = newVar;

    setVariables(newVars);
  };

  return <ChildComponent {...{ variables, onCopyVar, onDeleteVar, onAddVar, onEditVar }} />;
};
