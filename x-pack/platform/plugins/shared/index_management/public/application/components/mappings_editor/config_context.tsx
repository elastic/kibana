/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState } from 'react';

import type { DocLinksStart } from './shared_imports';
import type { IndexSettings } from './types';
import type { FieldSourceNameChange } from '@kbn/index-management-shared-types';

export type FieldEditDisplay = 'flyout' | 'inline';

export interface ContextState {
  indexSettings: IndexSettings;
  docLinks?: DocLinksStart;
  fieldEditDisplay?: FieldEditDisplay;
  allowMultiFields?: boolean;
  showFieldRename?: boolean;
  sourceNameField?: {
    label: string;
    helpText?: string;
    placeholder?: string;
    requiredErrorMessage?: string;
  };
  renameFieldField?: {
    label: string;
    helpText?: string;
  };
  fieldSourceNames?: Record<string, string>;
  onFieldSourceNameChange?: (change: FieldSourceNameChange) => void;
  allowedRootFieldTypes?: readonly string[];
  closeCreateFieldOnOutsideClick?: boolean;
  autoFocusCreateFieldType?: boolean;
  inlineOptionalDateFormatField?: {
    label: string;
    helpText?: string;
    placeholder?: string;
    presets?: ReadonlyArray<{ value: string; label: string }>;
    defaultPresetValue?: string;
    defaultPresetLiteral?: string;
  };
}

interface Context {
  value: ContextState;
  update: (value: ContextState) => void;
}

const ConfigContext = createContext<Context | undefined>(undefined);

interface Props {
  children: React.ReactNode;
  initialConfig?: ContextState;
}

export const ConfigProvider = ({ children, initialConfig }: Props) => {
  const [state, setState] = useState<ContextState>(() => ({
    indexSettings: {},
    ...initialConfig,
  }));

  return (
    <ConfigContext.Provider value={{ value: state, update: setState }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const ctx = useContext(ConfigContext);
  if (ctx === undefined) {
    throw new Error('useConfig must be used within a <ConfigProvider />');
  }
  return ctx;
};
