/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';

import { MlCapabilitiesContext } from '../../ml/permissions/ml_capabilities_provider';

export const useMlCapabilities = () => useContext(MlCapabilitiesContext);
