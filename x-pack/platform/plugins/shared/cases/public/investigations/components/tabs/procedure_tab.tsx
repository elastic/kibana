/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ProcedurePanel } from '../procedure/procedure_panel';
import type { TabProps } from './tab_props';

export const ProcedureTab: React.FC<TabProps> = (props) => <ProcedurePanel {...props} />;
ProcedureTab.displayName = 'ProcedureTab';
