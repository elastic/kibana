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

/**
 * The <EuiCode /> component expect the children provided to be a string (html). For that reason we can't use it directly with our
 * Tree component that renders DOM nodes.
 *
 * TODO: Open PR on eui repo to allow both string and React.Node to be passed as children of <EuiCode />
 */
export const FieldsTree = ({ fields }: Props) => (
  <div className="euiCodeBlock euiCodeBlock--fontSmall euiCodeBlock--paddingLarge">
    <pre className="euiCodeBlock__pre">
      <code className="euiCodeBlock__code">
        <Tree tree={fields} />
      </code>
    </pre>
  </div>
);
