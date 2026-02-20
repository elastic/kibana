/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';

import type { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../../client/attachment_framework/persistable_state_registry';
import type { UnifiedAttachmentTypeRegistry } from '../../client/attachment_framework/unified_attachment_registry';

import { APP_OWNER } from '../../../common/constants';
import { getCasesLazy } from '../../client/ui/get_cases';
import { useApplicationCapabilities } from '../../common/lib/kibana';
import type { CasesRoutesProps } from './types';

export type CasesProps = CasesRoutesProps;

interface CasesAppProps {
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
  getFilesClient: (scope: string) => ScopedFilesClient;
}

const CasesAppComponent: React.FC<CasesAppProps> = ({
  externalReferenceAttachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
  unifiedAttachmentTypeRegistry,
  getFilesClient,
}) => {
  const userCapabilities = useApplicationCapabilities();

  return (
    <div data-test-subj="cases-app">
      {getCasesLazy({
        externalReferenceAttachmentTypeRegistry,
        persistableStateAttachmentTypeRegistry,
        unifiedAttachmentTypeRegistry,
        getFilesClient,
        owner: [APP_OWNER],
        useFetchAlertData: () => [false, {}],
        permissions: userCapabilities.generalCasesV3,
        basePath: '/',
        features: {
          alerts: { enabled: true, sync: false },
          observables: { enabled: true, autoExtract: false },
        },
      })}
    </div>
  );
};

CasesAppComponent.displayName = 'CasesApp';

export const CasesApp = React.memo(CasesAppComponent);
