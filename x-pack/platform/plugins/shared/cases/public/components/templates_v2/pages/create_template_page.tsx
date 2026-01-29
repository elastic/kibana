/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HeaderPage } from '../../header_page';
interface Props {
  label?: string;
}
export const CreateTemplatePage: React.FC<Props> = ({ label = 'Create Template Page' }) => {
  return (
    <HeaderPage title={label} border data-test-subj="cases-all-title">
      <div>{label}</div>
    </HeaderPage>
  );
};

CreateTemplatePage.displayName = 'CreateTemplatePage';
