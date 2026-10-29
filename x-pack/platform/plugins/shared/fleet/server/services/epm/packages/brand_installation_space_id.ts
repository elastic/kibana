/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { brandSpaceId } from '@kbn/core-spaces-common';

import type { Installation } from '../../../../common/types';

/** Brands `installed_kibana_space_id` as SpaceId at Installation SO load/write boundaries. */
export const brandInstallationSpaceId = (attrs: Installation): Installation =>
  attrs.installed_kibana_space_id == null
    ? attrs
    : {
        ...attrs,
        installed_kibana_space_id: brandSpaceId(attrs.installed_kibana_space_id),
      };
