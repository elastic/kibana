/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { PropertyConflict } from '@kbn/content-packs-schema';
import { FieldDefinition, RoutingDefinition, StreamQuery } from '@kbn/streams-schema';
import React from 'react';

export function Conflict({
  conflict,
}: {
  conflict: PropertyConflict<FieldDefinition | RoutingDefinition | StreamQuery>;
}) {
  return (
    <>
      <EuiText>{JSON.stringify(conflict.current, null, 2)}</EuiText>
      <EuiText>{JSON.stringify(conflict.incoming, null, 2)}</EuiText>
    </>
  );
}
