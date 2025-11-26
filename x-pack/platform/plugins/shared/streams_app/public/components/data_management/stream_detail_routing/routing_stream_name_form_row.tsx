/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useStreamsRoutingSelector } from './state_management/stream_routing_state_machine';
import { StreamNameFormRow, type StreamNameFormRowProps } from '../../stream_name_form_row';

export function RoutingStreamNameFormRow(props: Omit<StreamNameFormRowProps, 'parentStreamName'>) {
  const parentStreamName = useStreamsRoutingSelector((snapshot) => snapshot.context.definition)
    .stream.name;

  return <StreamNameFormRow {...props} parentStreamName={parentStreamName} />;
}
