/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GenericFtrProviderContext } from '@kbn/test';
import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import {
  KibanaEBTUIProvider,
  KibanaEBTServerProvider,
} from '../../../analytics/services/kibana_ebt';
import { services as functionalServces } from '../../services';
import { pageObjects } from '../../page_objects';

const services = {
  ...functionalServces,
  ...commonFunctionalServices,
  kibana_ebt_server: KibanaEBTServerProvider,
  kibana_ebt_ui: KibanaEBTUIProvider,
};

export type FtrProviderContext = GenericFtrProviderContext<typeof services, typeof pageObjects>;
