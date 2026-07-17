/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EsqlViewsApp, type EsqlViewsAppProps } from './app';
import { CreateEditEsqlViewFlyoutV2 } from './create_edit_view_flyout_v2';

/**
 * V2 prototype: identical list/table page as V1, but the create/edit flyout's
 * "ES|QL Query Results" details toggle opens looking like a child flyout docked
 * beside the main one, instead of an overlay on top of it. See
 * `create_edit_view_flyout_v2.tsx` for the (purely visual, CSS-only) approach.
 */
export const EsqlViewsAppV2: React.FunctionComponent<EsqlViewsAppProps> = (props) => (
  <EsqlViewsApp {...props} FlyoutComponent={CreateEditEsqlViewFlyoutV2} />
);
