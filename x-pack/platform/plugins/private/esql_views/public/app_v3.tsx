/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EsqlViewsApp, type EsqlViewsAppProps } from './app';
import { CreateEditEsqlViewFlyoutV3 } from './create_edit_view_flyout_v3';

/**
 * V3 prototype: identical list/table page as V1/V2, but the create/edit flyout's results are
 * shown in a real docked child flyout (opened via a "Preview results" button) instead of an
 * inline accordion. See `create_edit_view_flyout_v3.tsx` for details.
 */
export const EsqlViewsAppV3: React.FunctionComponent<EsqlViewsAppProps> = (props) => (
  <EsqlViewsApp {...props} FlyoutComponent={CreateEditEsqlViewFlyoutV3} />
);
