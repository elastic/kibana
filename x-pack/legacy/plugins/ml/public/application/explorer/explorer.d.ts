/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FC } from 'react';

import { UrlState } from '../util/url_state';

import { JobSelection } from '../components/job_selector/use_job_selection';

import { ExplorerState } from '../explorer/reducers';
import { AppStateSelectedCells } from '../explorer/explorer_utils';

declare interface ExplorerProps {
  explorerState: ExplorerState;
  showCharts: boolean;
  setSelectedCells: (swimlaneSelectedCells: AppStateSelectedCells) => void;
}

export const Explorer: FC<ExplorerProps>;
