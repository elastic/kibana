/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TabPlaceholder } from './tab_placeholder';
import type { TabProps } from './tab_props';
import * as i18n from './translations';

/** Placeholder: a later change replaces this file with the real tab. */
export const ProcedureTab: React.FC<TabProps> = () => (
  <TabPlaceholder tabName={i18n.PROCEDURE} testSubj="investigationProcedureTab" />
);
ProcedureTab.displayName = 'ProcedureTab';
