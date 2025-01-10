/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { incidentTypes, severity } from '../../mock';
import type { Props } from '../api';
import type { ResilientIncidentTypes, ResilientSeverity } from '../types';

export const getIncidentTypes = async (props: Props): Promise<{ data: ResilientIncidentTypes }> =>
  Promise.resolve({ data: incidentTypes, actionId: '1' });

export const getSeverity = async (props: Props): Promise<{ data: ResilientSeverity }> =>
  Promise.resolve({ data: severity, actionId: '1' });
