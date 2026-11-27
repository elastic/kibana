/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActivityPanel } from '../activity/activity_panel';
import type { TabProps } from './tab_props';

export const ActivityTab: React.FC<TabProps> = (props) => <ActivityPanel {...props} />;
ActivityTab.displayName = 'ActivityTab';
