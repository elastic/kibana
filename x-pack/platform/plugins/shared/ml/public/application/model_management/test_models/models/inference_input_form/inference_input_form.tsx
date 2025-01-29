/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { INPUT_TYPE } from '../inference_base';
import { TextInputForm } from './text_input';
import { IndexInputForm } from './index_input';
import type { InferrerType } from '..';

interface Props {
  inferrer: InferrerType;
  inputType: INPUT_TYPE;
}

export const InferenceInputForm: FC<Props> = ({ inferrer, inputType }) => {
  return inputType === INPUT_TYPE.TEXT ? (
    <TextInputForm inferrer={inferrer} />
  ) : (
    <IndexInputForm inferrer={inferrer} />
  );
};
