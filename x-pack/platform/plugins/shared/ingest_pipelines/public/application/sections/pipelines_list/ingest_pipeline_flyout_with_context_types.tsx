/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPipelineFlyoutProps } from '../../../types';
import { AppServices, CoreServices } from '../..';

export type IngestPipelineFlyoutWithContextProps = {
  services: AppServices;
  coreServices: CoreServices;
} & IngestPipelineFlyoutProps;
