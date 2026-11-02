/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression } from '@kbn/interpreter';
import { decode } from '../../../common/lib/embeddable_dataurl';
import type { WorkpadAttributes } from '../../routes/workpad/workpad_attributes';

const baseWorkpadAttributes: WorkpadAttributes = {
  assets: {},
  '@timestamp': new Date().toISOString(),
  '@created': new Date().toISOString(),
  height: 100,
  width: 100,
  css: '',
  name: 'Test workpad',
  page: 0,
  pages: [],
  colors: [],
  variables: [],
  isWriteable: true,
};

const baseElement = {
  id: 'element-id',
  position: { left: 0, top: 0, width: 100, height: 100, angle: 0, parent: null },
  type: 'element' as const,
  filter: '',
};

const basePage = {
  id: 'page-id',
  style: { background: 'white' },
  transition: 'none' as const,
  groups: [],
};

export const makeWorkpad = (expression: string): WorkpadAttributes => ({
  ...baseWorkpadAttributes,
  pages: [{ ...basePage, elements: [{ ...baseElement, expression }] }],
});

export const getDecodedConfig = (workpad: WorkpadAttributes) =>
  decode(
    fromExpression(workpad.pages[0].elements[0].expression).chain[0].arguments.config[0] as string
  );

export const getExpressionFunctionName = (workpad: WorkpadAttributes) =>
  fromExpression(workpad.pages[0].elements[0].expression).chain[0].function;
