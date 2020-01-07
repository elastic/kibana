/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { AndOrBadge } from '../../and_or_badge';
import { BrowserFields } from '../../../containers/source';
import {
  OnChangeDataProviderKqlQuery,
  OnDataProviderEdited,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';

import { DataProvidersAnd, IS_OPERATOR } from './data_provider';
import { ProviderItemBadge } from './provider_item_badge';

interface ProviderItemAndPopoverProps {
  browserFields: BrowserFields;
  dataProvidersAnd: DataProvidersAnd[];
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onDataProviderEdited: OnDataProviderEdited;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  providerId: string;
  timelineId: string;
}

export class ProviderItemAnd extends React.PureComponent<ProviderItemAndPopoverProps> {
  public render() {
    const {
      browserFields,
      dataProvidersAnd,
      onDataProviderEdited,
      providerId,
      timelineId,
    } = this.props;

    return dataProvidersAnd.map((providerAnd: DataProvidersAnd, index: number) => (
      <React.Fragment key={`provider-item-and-${timelineId}-${providerId}-${providerAnd.id}`}>
        <EuiFlexItem>
          <AndOrBadge type="and" />
        </EuiFlexItem>
        <EuiFlexItem>
          <ProviderItemBadge
            andProviderId={providerAnd.id}
            browserFields={browserFields}
            deleteProvider={() => this.deleteAndProvider(providerId, providerAnd.id)}
            field={providerAnd.queryMatch.displayField || providerAnd.queryMatch.field}
            isEnabled={providerAnd.enabled}
            isExcluded={providerAnd.excluded}
            kqlQuery={providerAnd.kqlQuery}
            operator={providerAnd.queryMatch.operator || IS_OPERATOR}
            providerId={providerId}
            timelineId={timelineId}
            toggleEnabledProvider={() =>
              this.toggleEnabledAndProvider(providerId, !providerAnd.enabled, providerAnd.id)
            }
            toggleExcludedProvider={() =>
              this.toggleExcludedAndProvider(providerId, !providerAnd.excluded, providerAnd.id)
            }
            val={providerAnd.queryMatch.displayValue || providerAnd.queryMatch.value}
            onDataProviderEdited={onDataProviderEdited}
          />
        </EuiFlexItem>
      </React.Fragment>
    ));
  }

  private deleteAndProvider = (providerId: string, andProviderId: string) => {
    this.props.onDataProviderRemoved(providerId, andProviderId);
  };

  private toggleEnabledAndProvider = (
    providerId: string,
    enabled: boolean,
    andProviderId: string
  ) => {
    this.props.onToggleDataProviderEnabled({ providerId, enabled, andProviderId });
  };

  private toggleExcludedAndProvider = (
    providerId: string,
    excluded: boolean,
    andProviderId: string
  ) => {
    this.props.onToggleDataProviderExcluded({ providerId, excluded, andProviderId });
  };
}
