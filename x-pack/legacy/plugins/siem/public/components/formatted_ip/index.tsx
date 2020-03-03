/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isArray, isEmpty, isString, uniq } from 'lodash/fp';
import React from 'react';

import { DragEffects, DraggableWrapper } from '../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { getOrEmptyTagFromValue } from '../empty_value';
import { IPDetailsLink } from '../links';
import { parseQueryValue } from '../timeline/body/renderers/parse_query_value';
import { DataProvider, IS_OPERATOR } from '../timeline/data_providers/data_provider';
import { Provider } from '../timeline/data_providers/provider';

const getUniqueId = ({
  contextId,
  eventId,
  fieldName,
  address,
}: {
  contextId: string;
  eventId: string;
  fieldName: string;
  address: string | object | null | undefined;
}) => `formatted-ip-data-provider-${contextId}-${fieldName}-${address}-${eventId}`;

const tryStringify = (value: string | object | null | undefined): string => {
  try {
    return JSON.stringify(value);
  } catch (_) {
    return `${value}`;
  }
};

const getDataProvider = ({
  contextId,
  eventId,
  fieldName,
  address,
}: {
  contextId: string;
  eventId: string;
  fieldName: string;
  address: string | object | null | undefined;
}): DataProvider => ({
  enabled: true,
  id: escapeDataProviderId(getUniqueId({ contextId, eventId, fieldName, address })),
  name: `${fieldName}: ${parseQueryValue(address)}`,
  queryMatch: {
    field: fieldName,
    value: parseQueryValue(address),
    operator: IS_OPERATOR,
  },
  excluded: false,
  kqlQuery: '',
  and: [],
});

const NonDecoratedIpComponent: React.FC<{
  contextId: string;
  eventId: string;
  fieldName: string;
  truncate?: boolean;
  value: string | object | null | undefined;
}> = ({ contextId, eventId, fieldName, truncate, value }) => (
  <DraggableWrapper
    dataProvider={getDataProvider({ contextId, eventId, fieldName, address: value })}
    key={`non-decorated-ip-draggable-wrapper-${getUniqueId({
      contextId,
      eventId,
      fieldName,
      address: value,
    })}`}
    render={(dataProvider, _, snapshot) =>
      snapshot.isDragging ? (
        <DragEffects>
          <Provider dataProvider={dataProvider} />
        </DragEffects>
      ) : typeof value !== 'object' ? (
        getOrEmptyTagFromValue(value)
      ) : (
        getOrEmptyTagFromValue(tryStringify(value))
      )
    }
    truncate={truncate}
  />
);

const NonDecoratedIp = React.memo(NonDecoratedIpComponent);

const AddressLinksComponent: React.FC<{
  addresses: string[];
  contextId: string;
  eventId: string;
  fieldName: string;
  truncate?: boolean;
}> = ({ addresses, contextId, eventId, fieldName, truncate }) => (
  <>
    {uniq(addresses).map(address => (
      <DraggableWrapper
        dataProvider={getDataProvider({ contextId, eventId, fieldName, address })}
        key={`address-links-draggable-wrapper-${getUniqueId({
          contextId,
          eventId,
          fieldName,
          address,
        })}`}
        render={(_, __, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider
                dataProvider={getDataProvider({ contextId, eventId, fieldName, address })}
              />
            </DragEffects>
          ) : (
            <IPDetailsLink data-test-sub="ip-details" ip={address} />
          )
        }
        truncate={truncate}
      />
    ))}
  </>
);

const AddressLinks = React.memo(AddressLinksComponent);

const FormattedIpComponent: React.FC<{
  contextId: string;
  eventId: string;
  fieldName: string;
  truncate?: boolean;
  value: string | object | null | undefined;
}> = ({ contextId, eventId, fieldName, truncate, value }) => {
  if (isString(value) && !isEmpty(value)) {
    try {
      const addresses = JSON.parse(value);
      if (isArray(addresses)) {
        return (
          <AddressLinks
            addresses={addresses}
            contextId={contextId}
            eventId={eventId}
            fieldName={fieldName}
            truncate={truncate}
          />
        );
      }
    } catch (_) {
      // fall back to formatting it as a single link
    }

    // return a single draggable link
    return (
      <AddressLinks
        addresses={[value]}
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        truncate={truncate}
      />
    );
  } else {
    return (
      <NonDecoratedIp
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        truncate={truncate}
        value={value}
      />
    );
  }
};

export const FormattedIp = React.memo(FormattedIpComponent);
