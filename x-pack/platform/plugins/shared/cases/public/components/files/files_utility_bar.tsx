/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGroup } from '@elastic/eui';
import { AddFile } from './add_file';

interface FilesUtilityBarProps {
  caseId: string;
}

export const FilesUtilityBar = ({ caseId }: FilesUtilityBarProps) => {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="none">
      <AddFile caseId={caseId} />
    </EuiFlexGroup>
  );
};

FilesUtilityBar.displayName = 'FilesUtilityBar';
