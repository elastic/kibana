/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';
import { isEqual } from 'lodash';
import type { PhaseName } from '@kbn/streams-schema';
import type { IlmPhasesFlyoutFormInternal } from './types';

export type OnFieldErrorsChange = (path: string, errors: string[] | null) => void;

const OnFieldErrorsChangeContext = createContext<OnFieldErrorsChange | null>(null);

export const OnFieldErrorsChangeProvider = ({
  value,
  children,
}: {
  value: OnFieldErrorsChange;
  children: React.ReactNode;
}) => {
  return React.createElement(OnFieldErrorsChangeContext.Provider, { value }, children);
};

export const useOnFieldErrorsChange = (): OnFieldErrorsChange | null => {
  return useContext(OnFieldErrorsChangeContext);
};

export const useIlmPhasesFlyoutTabErrors = (formData: IlmPhasesFlyoutFormInternal | undefined) => {
  const [errorsByPath, setErrorsByPath] = useState<Record<string, string[] | null>>({});

  const onFieldErrorsChange = useCallback<OnFieldErrorsChange>((path, errors) => {
    setErrorsByPath((prev) => {
      if (isEqual(prev[path], errors)) return prev;
      return { ...prev, [path]: errors };
    });
  }, []);

  const tabHasErrors = useCallback(
    (phaseName: PhaseName) => {
      const hasErrorAt = (path: string) => Boolean(errorsByPath[path]?.length);

      // Min age validations live on the value field for warm/cold/frozen/delete.
      if (phaseName !== 'hot' && hasErrorAt(`_meta.${phaseName}.minAgeValue`)) return true;

      // Downsample validations live on the fixedIntervalValue field.
      const downsampleEnabled = Boolean((formData as any)?._meta?.[phaseName]?.downsampleEnabled);
      if (
        (phaseName === 'hot' || phaseName === 'warm' || phaseName === 'cold') &&
        downsampleEnabled &&
        hasErrorAt(`_meta.${phaseName}.downsample.fixedIntervalValue`)
      ) {
        return true;
      }

      // Searchable snapshot repository is a shared field, but should surface per-phase.
      const repositoryHasError = hasErrorAt('_meta.searchableSnapshot.repository');
      if (repositoryHasError) {
        const coldSnapshotEnabled = Boolean(
          (formData as any)?._meta?.cold?.searchableSnapshotEnabled
        );
        if (phaseName === 'cold' && coldSnapshotEnabled) return true;
        if (phaseName === 'frozen') return true; // Frozen always requires searchable snapshots.
      }

      return false;
    },
    [errorsByPath, formData]
  );

  return { onFieldErrorsChange, tabHasErrors };
};
