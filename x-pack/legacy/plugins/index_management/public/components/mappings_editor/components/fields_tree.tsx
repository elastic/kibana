/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Tree, TreeItem } from './tree';

interface Props {
  fields: TreeItem[];
}

export const FieldsTree = ({ fields }: Props) => (
  <div className="euiCodeBlock euiCodeBlock--fontSmall euiCodeBlock--paddingLarge">
    <pre className="euiCodeBlock__pre">
      <code className="euiCodeBlock__code">
        <Tree tree={fields} />
      </code>
    </pre>
  </div>
);
