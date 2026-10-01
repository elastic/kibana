/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CoreStart } from '@kbn/core/public';

import type { ServiceAccountDirectoryEntry } from '../../common/service_accounts';

export type ServiceAccountPickerStatus = 'loading' | 'ready' | 'forbidden' | 'unavailable';

export interface ServiceAccountPickerDirectory {
  accounts: ServiceAccountDirectoryEntry[];
  status: ServiceAccountPickerStatus;
  hasMore?: boolean;
  filtered?: boolean;
  onRetry: () => void;
  onLoadMore?: () => void;
}

export interface ServiceAccountPickerProps {
  selectedId?: string;
  onSelect: (account: ServiceAccountDirectoryEntry) => void;
  search?: string;
  onClose?: () => void;
  /** Supply a directory when the host already loads accounts, for example in an editor. */
  directory?: ServiceAccountPickerDirectory;
  /** Override creation when the host must preserve an editing position across the flyout. */
  onCreate?: () => void;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
}

export const getServiceAccountPickerComponent = async (
  core: CoreStart,
  isServerless: boolean,
  roleManagementEnabled: boolean
): Promise<React.FC<ServiceAccountPickerProps>> => {
  const { ServiceAccountPicker } = await import(
    '../management/service_accounts/service_account_picker'
  );
  return (props) => (
    <ServiceAccountPicker
      {...props}
      core={core}
      isServerless={isServerless}
      roleManagementEnabled={roleManagementEnabled}
    />
  );
};
