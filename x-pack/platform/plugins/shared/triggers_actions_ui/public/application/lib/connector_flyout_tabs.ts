/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { fetchConnectorTypes } from '@kbn/alerts-ui-shared/src/common/apis/fetch_connector_types';
import { useKibana } from '../../common/lib/kibana';
import type { ActionConnector } from '../../types';

/**
 * Changes a tab holds that the flyout's Save button should save together with the connector. A tab reports them with
 * `onChanges` whenever they change, and reports `null` when it has none or goes away.
 */
export interface ConnectorFlyoutTabChanges {
  /** There is something to save. It enables the flyout's Save button and asks for confirmation before closing. */
  isDirty: boolean;
  /** The changes can be saved; Save stays disabled while this is false. */
  isValid: boolean;
  /** Saves the changes. Rejecting stops the flyout's save, so the connector itself is not saved. */
  save: () => Promise<void>;
}

/** What a tab is told about the connector the flyout is open on. */
export interface ConnectorFlyoutTabProps {
  connector: ActionConnector;
  /** True when the connector cannot be edited here (preconfigured, or the user lacks the privilege). */
  isReadOnly: boolean;
  /** Reports the tab's unsaved changes so the flyout's Save button saves them too. */
  onChanges: (changes: ConnectorFlyoutTabChanges | null) => void;
}

/** What `isSupported` decides from: the connector's type and the features that type declares. */
export interface ConnectorFlyoutTabTarget {
  actionTypeId: string;
  supportedFeatureIds: string[];
}

/** A tab another plugin adds to the Edit connector flyout. */
export interface ConnectorFlyoutTab {
  /** Unique, and not one of the flyout's own ('configuration', 'test', 'rules'). */
  id: string;
  /** Already translated. */
  title: string;
  /** Whether the tab applies to this connector, for example because its type declares a feature. */
  isSupported: (target: ConnectorFlyoutTabTarget) => boolean;
  render: (props: ConnectorFlyoutTabProps) => ReactNode;
}

const BUILT_IN_TAB_IDS = ['configuration', 'test', 'rules'];

/** Shared rather than passed down: the flyout is rendered from several places, including other plugins. */
const registeredTabs: ConnectorFlyoutTab[] = [];

export const registerConnectorFlyoutTab = (tab: ConnectorFlyoutTab): void => {
  if (BUILT_IN_TAB_IDS.includes(tab.id) || registeredTabs.some(({ id }) => id === tab.id)) {
    throw new Error(`The connector flyout already has a tab with the id "${tab.id}".`);
  }
  registeredTabs.push(tab);
};

/** For tests. */
export const clearConnectorFlyoutTabs = (): void => {
  registeredTabs.length = 0;
};

/**
 * The extra tabs that apply to a connector. Nothing is requested unless some plugin has registered a tab; then the
 * connector types are read once (they carry the features each type declares) and shared by every flyout.
 */
export const useConnectorFlyoutTabs = (actionTypeId: string): ConnectorFlyoutTab[] => {
  const { http } = useKibana().services;

  const { data: connectorTypes } = useQuery({
    queryKey: ['connectorFlyoutTabs', 'connectorTypes'],
    queryFn: () => fetchConnectorTypes({ http }),
    enabled: registeredTabs.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return useMemo(() => {
    const type = connectorTypes?.find(({ id }) => id === actionTypeId);
    const target = { actionTypeId, supportedFeatureIds: type?.supportedFeatureIds ?? [] };
    return type ? registeredTabs.filter((tab) => tab.isSupported(target)) : [];
  }, [connectorTypes, actionTypeId]);
};
