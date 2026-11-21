/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ScopePanel } from '../scope/scope_panel';
import type { TabProps } from './tab_props';

export const ScopeTab: React.FC<TabProps> = (props) => <ScopePanel {...props} />;
ScopeTab.displayName = 'ScopeTab';
