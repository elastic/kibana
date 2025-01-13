/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { canUserWrite as canUserWriteSelector } from '../../../state/selectors/app';
import type { State } from '../../../../types';

import { useImportWorkpad } from '../hooks';
import { WorkpadImport as Component, Props as ComponentProps } from './workpad_import.component';

type Props = Omit<ComponentProps, 'canUserWrite' | 'onImportWorkpad'>;

export const WorkpadImport = (props: Props) => {
  const importWorkpad = useImportWorkpad();
  const [uniqueKey, setUniqueKey] = useState(Date.now());

  const { canUserWrite } = useSelector((state: State) => ({
    canUserWrite: canUserWriteSelector(state),
  }));

  const onImportWorkpad: ComponentProps['onImportWorkpad'] = (files) => {
    if (files) {
      importWorkpad(files[0]);
    }
    setUniqueKey(Date.now());
  };

  return <Component {...{ ...props, uniqueKey, onImportWorkpad, canUserWrite }} />;
};
