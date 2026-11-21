/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CasesPublicStartDependencies } from '../types';

/** Services available to every component of the Investigations app through `useKibana`. */
export type InvestigationsServices = CoreStart & Pick<CasesPublicStartDependencies, 'agentBuilder'>;

export const useInvestigationsServices = (): InvestigationsServices =>
  useKibana<InvestigationsServices>().services;
