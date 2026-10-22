/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { AppDependencies } from '../../../../app_context';
import type { ExtensionsService } from '../../../../../services/extensions_service';

export interface CreateIndexOverviewModalProps {
  onClose: () => void;
  core: CoreStart;
  dependencies: Omit<AppDependencies, 'services'> & {
    services: { extensionsService: ExtensionsService };
  };
}

const CreateIndexOverviewModalContent = React.lazy(() =>
  import('./create_index_overview_modal_content').then((module) => ({
    default: module.CreateIndexOverviewModalContent,
  }))
);

/** Create-index modal hosted outside the Index Management app. */
export const CreateIndexOverviewModal = (props: CreateIndexOverviewModalProps) => (
  <Suspense fallback={null}>
    <CreateIndexOverviewModalContent {...props} />
  </Suspense>
);
