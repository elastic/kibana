/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataStream, RegistryVarsEntry } from '../../../../../../types';

export interface InputFieldProps {
  varDef: RegistryVarsEntry;
  value: any;
  onChange: (newValue: any) => void;
  errors?: string[] | null;
  forceShowErrors?: boolean;
  frozen?: boolean;
  packageType?: string;
  packageName?: string;
  datastreams?: DataStream[];
  isEditPage?: boolean;
}

export type InputComponentProps = InputFieldProps & {
  isDirty: boolean;
  setIsDirty: (isDirty: boolean) => void;
  packageType?: string;
  isInvalid: boolean;
  fieldLabel: string;
  fieldTestSelector: string;
};
