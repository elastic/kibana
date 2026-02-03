/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';

export function getIcon(spec: ConnectorSpec): IconType {
  // Check if icon is set in the spec metadata
  if (spec.metadata.icon) {
    return spec.metadata.icon;
  }

  // Check if icon is registered in the connector icon map
  const lazyIcon = ConnectorIconsMap.get(spec.metadata.id);
  if (lazyIcon) {
    return lazyIcon;
  }

  // Default to plugs icon
  return 'plugs';
}
