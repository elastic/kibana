/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { PropertyConflict } from '@kbn/content-packs-schema';

export function Conflict({ conflict }: { conflict: PropertyConflict }) {
  return (
    <>
      <EuiText>{JSON.stringify(conflict.value.current, null, 2)}</EuiText>
      <EuiText>{JSON.stringify(conflict.value.incoming, null, 2)}</EuiText>
    </>
  );
}
