/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSourceWithSecrets } from '../../common/datasource_types';

/** React-hook-form values; data source `type` is flyout UI state, not a form field. */
export type CreateDataSourceFlyoutFormValues = Omit<DataSourceWithSecrets, 'type'>;
