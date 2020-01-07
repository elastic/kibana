/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import React from 'react';

import { DataProvider, IS_OPERATOR } from './data_provider';
import { ProviderItemBadge } from './provider_item_badge';

interface OwnProps {
  dataProvider: DataProvider;
}

export const Provider = React.memo<OwnProps>(({ dataProvider }) => (
  <ProviderItemBadge
    deleteProvider={noop}
    field={dataProvider.queryMatch.displayField || dataProvider.queryMatch.field}
    isEnabled={dataProvider.enabled}
    isExcluded={dataProvider.excluded}
    kqlQuery={dataProvider.kqlQuery}
    operator={dataProvider.queryMatch.operator || IS_OPERATOR}
    providerId={dataProvider.id}
    toggleEnabledProvider={noop}
    toggleExcludedProvider={noop}
    val={dataProvider.queryMatch.displayValue || dataProvider.queryMatch.value}
  />
));

Provider.displayName = 'Provider';
