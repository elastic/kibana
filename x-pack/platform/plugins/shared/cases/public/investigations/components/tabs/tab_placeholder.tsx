/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import * as i18n from './translations';

/** Placeholder shared by the tab files until each tab is built. */
export const TabPlaceholder: React.FC<{ tabName: string; testSubj: string }> = ({
  tabName,
  testSubj,
}) => (
  <EuiEmptyPrompt
    title={<h2>{i18n.TAB_COMING_TITLE(tabName)}</h2>}
    body={<p>{i18n.TAB_COMING_BODY}</p>}
    titleSize="s"
    data-test-subj={testSubj}
  />
);
TabPlaceholder.displayName = 'TabPlaceholder';
