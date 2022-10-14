/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';

import { exampleFileKind } from '../../common';

import { FilePicker } from '../imports';

interface Props {
  onClose: () => void;
  onDone: (ids: string[]) => void;
}

export const MyFilePicker: FunctionComponent<Props> = ({ onClose, onDone }) => {
  return <FilePicker kind={exampleFileKind.id} onClose={onClose} onDone={onDone} />;
};
