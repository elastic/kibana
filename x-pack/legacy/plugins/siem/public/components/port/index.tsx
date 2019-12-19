/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { DefaultDraggable } from '../draggables';
import { getEmptyValue } from '../empty_value';
import { ExternalLinkIcon } from '../external_link_icon';
import { PortOrServiceNameLink } from '../links';

export const CLIENT_PORT_FIELD_NAME = 'client.port';
export const DESTINATION_PORT_FIELD_NAME = 'destination.port';
export const SERVER_PORT_FIELD_NAME = 'server.port';
export const SOURCE_PORT_FIELD_NAME = 'source.port';
export const URL_PORT_FIELD_NAME = 'url.port';

export const PORT_NAMES = [
  CLIENT_PORT_FIELD_NAME,
  DESTINATION_PORT_FIELD_NAME,
  SERVER_PORT_FIELD_NAME,
  SOURCE_PORT_FIELD_NAME,
  URL_PORT_FIELD_NAME,
];

export const Port = React.memo<{
  contextId: string;
  eventId: string;
  fieldName: string;
  value: string | undefined | null;
}>(({ contextId, eventId, fieldName, value }) => (
  <DefaultDraggable
    data-test-subj="port"
    field={fieldName}
    id={`port-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
    tooltipContent={fieldName}
    value={value}
  >
    <PortOrServiceNameLink portOrServiceName={value || getEmptyValue()} />
    <ExternalLinkIcon />
  </DefaultDraggable>
));

Port.displayName = 'Port';
