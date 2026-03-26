/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { ControlBarDependencies, ControlBarProps } from '../shared/control_bar';
import { ControlBar } from '../shared/control_bar';

// For now it's conincidentally the same control bar, but the planned designs
// indicate that it will diverge in the future
export type LogCategoriesControlBarProps = ControlBarProps;

export type LogCategoriesControlBarDependencies = ControlBarDependencies;

export const LogCategoriesControlBar: React.FC<LogCategoriesControlBarProps> = ControlBar;
