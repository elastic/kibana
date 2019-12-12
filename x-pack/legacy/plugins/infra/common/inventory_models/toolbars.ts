/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactNode, FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { InventoryItemType } from './types';
import { HostToolbarItems } from './host/toolbar_items';
import { ContainerToolbarItems } from './container/toolbar_items';
import { PodToolbarItems } from './pod/toolbar_items';
import { ToolbarProps } from '../../public/components/inventory/toolbars/toolbar';

interface Toolbars {
  [type: string]: ReactNode;
}

const toolbars: Toolbars = {
  host: HostToolbarItems,
  container: ContainerToolbarItems,
  pod: PodToolbarItems,
};

export const findToolbar = (type: InventoryItemType) => {
  const Toolbar = toolbars?.[type];
  if (!Toolbar) {
    throw new Error(
      i18n.translate('xpack.infra.inventoryModels.findToolbar.error', {
        defaultMessage: "The toolbar you've attempted to find does not exist.",
      })
    );
  }
  return Toolbar as FunctionComponent<ToolbarProps>;
};
