/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { FilesContext } from '@kbn/shared-ux-file-context';
import { constructFileKindIdByOwner } from '../../../common/files';
import { isRegisteredOwner } from '../../files';
import { CasesContext } from '.';
import { useCasesContext } from './use_cases_context';

/**
 * Inside an ownerless context (the top-level Cases app), scopes a case's subtree to the case's
 * owner: its configuration, attachment types, and file kind then resolve as they did when each
 * solution mounted Cases for its own owner. Contexts that already have an owner are left alone.
 */
export const CaseOwnerScope: FC<PropsWithChildren<{ caseOwner: string }>> = ({
  caseOwner,
  children,
}) => {
  const context = useCasesContext();
  const scoped = context.owner.length === 0;
  const value = useMemo(() => ({ ...context, owner: [caseOwner] }), [context, caseOwner]);

  if (!scoped) {
    return <>{children}</>;
  }

  const { getFilesClient } = context;
  return (
    <CasesContext.Provider value={value}>
      {getFilesClient && isRegisteredOwner(caseOwner) ? (
        <FilesContext client={getFilesClient(constructFileKindIdByOwner(caseOwner))}>
          {children}
        </FilesContext>
      ) : (
        children
      )}
    </CasesContext.Provider>
  );
};

CaseOwnerScope.displayName = 'CaseOwnerScope';
