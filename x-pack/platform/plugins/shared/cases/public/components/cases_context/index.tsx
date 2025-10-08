/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, ReactNode, FC, PropsWithChildren } from 'react';

import { merge } from 'lodash';
import React, { useCallback, useMemo, useReducer } from 'react';

import type { ScopedFilesClient } from '@kbn/files-plugin/public';
import { FilesContext } from '@kbn/shared-ux-file-context';

import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import type {
  CasesFeaturesAllRequired,
  CasesFeatures,
  CasesPermissions,
} from '../../containers/types';
import type { ReleasePhase } from '../types';
import type { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../../client/attachment_framework/persistable_state_registry';

import { CasesGlobalComponents } from './cases_global_components';
import { DEFAULT_FEATURES } from '../../../common/constants';
import { constructFileKindIdByOwner } from '../../../common/files';
import { DEFAULT_BASE_PATH } from '../../common/navigation';
import type { CasesContextStoreAction } from './state/cases_context_reducer';
import { casesContextReducer, getInitialCasesContextState } from './state/cases_context_reducer';
import { CasesStateContext } from './state/cases_state_context';
import { isRegisteredOwner } from '../../files';
import { casesQueryClient } from './query_client';

type CasesContextValueDispatch = Dispatch<CasesContextStoreAction>;

export interface CasesContextValue {
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  owner: string[];
  permissions: CasesPermissions;
  basePath: string;
  features: CasesFeaturesAllRequired;
  releasePhase: ReleasePhase;
  dispatch: CasesContextValueDispatch;
}

export interface CasesContextProps
  extends Pick<
    CasesContextValue,
    | 'owner'
    | 'permissions'
    | 'externalReferenceAttachmentTypeRegistry'
    | 'persistableStateAttachmentTypeRegistry'
  > {
  basePath?: string;
  features?: CasesFeatures;
  releasePhase?: ReleasePhase;
  getFilesClient: (scope: string) => ScopedFilesClient;
}

export const CasesContext = React.createContext<CasesContextValue | undefined>(undefined);

export const CasesProvider: FC<
  PropsWithChildren<{
    value: CasesContextProps;
    queryClient?: QueryClient;
  }>
> = ({
  children,
  value: {
    externalReferenceAttachmentTypeRegistry,
    persistableStateAttachmentTypeRegistry,
    owner,
    permissions,
    basePath = DEFAULT_BASE_PATH,
    features = {},
    releasePhase = 'ga',
    getFilesClient,
  },
  queryClient = casesQueryClient,
}) => {
  const [state, dispatch] = useReducer(casesContextReducer, getInitialCasesContextState());

  const value: CasesContextValue = useMemo(
    () => ({
      externalReferenceAttachmentTypeRegistry,
      persistableStateAttachmentTypeRegistry,
      owner,
      permissions: {
        all: permissions.all,
        connectors: permissions.connectors,
        create: permissions.create,
        delete: permissions.delete,
        push: permissions.push,
        read: permissions.read,
        settings: permissions.settings,
        update: permissions.update,
        reopenCase: permissions.reopenCase,
        createComment: permissions.createComment,
        assign: permissions.assign,
      },
      basePath,
      /**
       * The empty object at the beginning avoids the mutation
       * of the DEFAULT_FEATURES object
       */
      features: merge<object, CasesFeaturesAllRequired, CasesFeatures>(
        {},
        DEFAULT_FEATURES,
        features
      ),
      releasePhase,
      dispatch,
    }),
    /**
     * We want to trigger a rerender only when the permissions will change.
     * The registries, the owner, and the rest of the values should
     * not change during the lifecycle of the cases application.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      permissions.all,
      permissions.connectors,
      permissions.create,
      permissions.delete,
      permissions.push,
      permissions.read,
      permissions.settings,
      permissions.update,
      permissions.reopenCase,
      permissions.createComment,
      permissions.assign,
    ]
  );

  const applyFilesContext = useCallback(
    (contextChildren: ReactNode) => {
      if (owner.length === 0) {
        return contextChildren;
      }

      if (isRegisteredOwner(owner[0])) {
        return (
          <FilesContext client={getFilesClient(constructFileKindIdByOwner(owner[0]))}>
            {contextChildren}
          </FilesContext>
        );
      } else {
        throw new Error(
          'Invalid owner provided to cases context. See https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/cases/README.md#casescontext-setup'
        );
      }
    },
    [getFilesClient, owner]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CasesStateContext.Provider value={state}>
        <CasesContext.Provider value={value}>
          {applyFilesContext(
            <>
              <CasesGlobalComponents state={state} />
              {children}
            </>
          )}
        </CasesContext.Provider>
      </CasesStateContext.Provider>
    </QueryClientProvider>
  );
};

CasesProvider.displayName = 'CasesProvider';

// eslint-disable-next-line import/no-default-export
export default CasesProvider;
