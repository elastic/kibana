/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FC } from 'react';

import { State } from 'ui/state_management/state';

import { JobSelectService$ } from '../components/job_selector/job_select_service_utils';

declare interface ExplorerProps {
  globalState: State;
  jobSelectService$: JobSelectService$;
}

export const Explorer: FC<ExplorerProps>;
