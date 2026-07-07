/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { IndexMappingProps } from '@kbn/index-management-shared-types';
import type { AppDependencies } from '../../../../../app_context';
import type { ExtensionsService } from '../../../../../../services/extensions_service';

export type IndexMappingWithContextProps = {
  core: CoreStart;
  // omitting services here to constitute them inside the component
  // this helps reduce bundle size significantly
  dependencies: Omit<AppDependencies, 'services'> & {
    services: { extensionsService: ExtensionsService };
  };
} & IndexMappingProps;
