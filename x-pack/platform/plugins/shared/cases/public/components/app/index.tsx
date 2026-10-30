/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';

import type { UnifiedAttachmentTypeRegistry } from '../../client/attachment_framework/unified_attachment_registry';

import { APP_OWNER } from '../../../common/constants';
import { getCasesLazy } from '../../client/ui/get_cases';
import { useApplicationCapabilities } from '../../common/lib/kibana';
import { isTopLevelAppEnabled } from '../../common/top_level_app';
import type { CasesRoutesProps } from './types';

export type CasesProps = CasesRoutesProps;

interface CasesAppProps {
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
  getFilesClient: (scope: string) => ScopedFilesClient;
}

const CasesAppComponent: React.FC<CasesAppProps> = ({
  unifiedAttachmentTypeRegistry,
  getFilesClient,
}) => {
  const userCapabilities = useApplicationCapabilities();

  return (
    <div data-test-subj="cases-app">
      {getCasesLazy({
        unifiedAttachmentTypeRegistry,
        getFilesClient,
        // The top-level app shows every solution's cases; each case view scopes itself to its
        // case's owner (see CaseOwnerScope).
        owner: isTopLevelAppEnabled() ? [] : [APP_OWNER],
        permissions: userCapabilities.generalCasesV3,
        basePath: '/',
      })}
    </div>
  );
};

CasesAppComponent.displayName = 'CasesApp';

export const CasesApp = React.memo(CasesAppComponent);
