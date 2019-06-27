/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiContextMenu, EuiContextMenuPanelDescriptor, EuiPopover } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../../containers/source';
import { OnDataProviderEdited } from '../events';
import { QueryOperator, EXISTS_OPERATOR } from './data_provider';
import { StatefulEditDataProvider } from '../../edit_data_provider';

import * as i18n from './translations';

export const EDIT_CLASS_NAME = 'edit-data-provider';
export const EXCLUDE_CLASS_NAME = 'exclude-data-provider';
export const ENABLE_CLASS_NAME = 'enable-data-provider';
export const FILTER_FOR_FIELD_PRESENT_CLASS_NAME = 'filter-for-field-present-data-provider';
export const DELETE_CLASS_NAME = 'delete-data-provider';

interface OwnProps {
  andProviderId?: string;
  browserFields?: BrowserFields;
  button: JSX.Element;
  closePopover: () => void;
  deleteProvider: () => void;
  field: string;
  kqlQuery: string;
  isEnabled: boolean;
  isExcluded: boolean;
  isLoading: boolean;
  isOpen: boolean;
  onDataProviderEdited?: OnDataProviderEdited;
  operator: QueryOperator;
  providerId: string;
  timelineId?: string;
  toggleEnabledProvider: () => void;
  toggleExcludedProvider: () => void;
  value: string | number;
}

const MyEuiPopover = styled(EuiPopover)`
  height: 100%;
  user-select: none;
`;

export const getProviderActions = ({
  andProviderId,
  browserFields,
  deleteItem,
  field,
  isEnabled,
  isExcluded,
  isLoading,
  operator,
  onDataProviderEdited,
  onFilterForFieldPresent,
  providerId,
  timelineId,
  toggleEnabled,
  toggleExcluded,
  value,
}: {
  andProviderId?: string;
  browserFields?: BrowserFields;
  deleteItem: () => void;
  field: string;
  isEnabled: boolean;
  isExcluded: boolean;
  isLoading: boolean;
  onDataProviderEdited?: OnDataProviderEdited;
  onFilterForFieldPresent: () => void;
  operator: QueryOperator;
  providerId: string;
  timelineId?: string;
  toggleEnabled: () => void;
  toggleExcluded: () => void;
  value: string | number;
}): EuiContextMenuPanelDescriptor[] => [
  {
    id: 0,
    items: [
      {
        className: EDIT_CLASS_NAME,
        disabled: isLoading,
        icon: 'pencil',
        name: i18n.EDIT_MENU_ITEM,
        panel: 1,
      },
      {
        className: EXCLUDE_CLASS_NAME,
        disabled: isLoading,
        icon: `${isExcluded ? 'plusInCircle' : 'minusInCircle'}`,
        name: isExcluded ? i18n.INCLUDE_DATA_PROVIDER : i18n.EXCLUDE_DATA_PROVIDER,
        onClick: toggleExcluded,
      },
      {
        className: ENABLE_CLASS_NAME,
        disabled: isLoading,
        icon: `${isEnabled ? 'eyeClosed' : 'eye'}`,
        name: isEnabled ? i18n.TEMPORARILY_DISABLE_DATA_PROVIDER : i18n.RE_ENABLE_DATA_PROVIDER,
        onClick: toggleEnabled,
      },
      {
        className: FILTER_FOR_FIELD_PRESENT_CLASS_NAME,
        disabled: isLoading,
        icon: 'logstashFilter',
        name: i18n.FILTER_FOR_FIELD_PRESENT,
        onClick: onFilterForFieldPresent,
      },
      {
        className: DELETE_CLASS_NAME,
        disabled: isLoading,
        icon: 'trash',
        name: i18n.DELETE_DATA_PROVIDER,
        onClick: deleteItem,
      },
    ],
  },
  {
    content:
      browserFields != null && timelineId != null && onDataProviderEdited != null ? (
        <StatefulEditDataProvider
          andProviderId={andProviderId}
          browserFields={browserFields}
          field={field}
          isExcluded={isExcluded}
          onDataProviderEdited={onDataProviderEdited}
          operator={operator}
          providerId={providerId}
          timelineId={timelineId}
          value={value}
        />
      ) : null,
    id: 1,
    title: i18n.EDIT_TITLE,
    width: 400,
  },
];

export class ProviderItemActions extends React.PureComponent<OwnProps> {
  public render() {
    const {
      andProviderId,
      browserFields,
      button,
      closePopover,
      deleteProvider,
      field,
      isEnabled,
      isExcluded,
      isLoading,
      isOpen,
      operator,
      providerId,
      timelineId,
      toggleEnabledProvider,
      toggleExcludedProvider,
      value,
    } = this.props;

    const panelTree = getProviderActions({
      andProviderId,
      browserFields,
      deleteItem: deleteProvider,
      field,
      isEnabled,
      isExcluded,
      isLoading,
      onDataProviderEdited: this.onDataProviderEdited,
      onFilterForFieldPresent: this.onFilterForFieldPresent,
      operator,
      providerId,
      timelineId,
      toggleEnabled: toggleEnabledProvider,
      toggleExcluded: toggleExcludedProvider,
      value,
    });

    return (
      <MyEuiPopover
        id={`popoverFor_${providerId}-${field}-${value}`}
        isOpen={isOpen}
        closePopover={closePopover}
        button={button}
        anchorPosition="downCenter"
        panelPaddingSize="none"
      >
        <div style={{ userSelect: 'none' }}>
          <EuiContextMenu initialPanelId={0} panels={panelTree} data-test-subj="providerActions" />
        </div>
      </MyEuiPopover>
    );
  }

  private onDataProviderEdited: OnDataProviderEdited = ({
    andProviderId,
    excluded,
    field,
    id,
    operator,
    providerId,
    value,
  }) => {
    if (this.props.onDataProviderEdited != null) {
      this.props.onDataProviderEdited({
        andProviderId,
        excluded,
        field,
        id,
        operator,
        providerId,
        value,
      });
    }

    this.props.closePopover();
  };

  private onFilterForFieldPresent = () => {
    const { andProviderId, field, timelineId, providerId, value } = this.props;

    if (this.props.onDataProviderEdited != null) {
      this.props.onDataProviderEdited({
        andProviderId,
        excluded: false,
        field,
        id: `${timelineId}`,
        operator: EXISTS_OPERATOR,
        providerId,
        value,
      });
    }

    this.props.closePopover();
  };
}
