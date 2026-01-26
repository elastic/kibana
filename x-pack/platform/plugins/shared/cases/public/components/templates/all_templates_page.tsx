/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

interface Props {
  props: { test: string };
}
export const AllTemplatesPage: React.FC<Props> = ({ props }) => {
  return (
    <div>
      <h1>{props?.test || 'All Templates'}</h1>
    </div>
  );
};
AllTemplatesPage.displayName = 'AllTemplatesPage';
