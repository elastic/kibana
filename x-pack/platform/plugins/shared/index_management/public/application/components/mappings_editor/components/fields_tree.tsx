/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CodeBlock } from './code_block';
import type { TreeItem } from './tree';
import { Tree } from './tree';

interface Props {
  fields: TreeItem[];
}

export const FieldsTree = ({ fields }: Props) => (
  <CodeBlock>
    <Tree tree={fields} />
  </CodeBlock>
);
