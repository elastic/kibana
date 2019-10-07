/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';

import { DetectionEngineComponent } from './detection_engine';

export const DetectionEngine = memo(() => <DetectionEngineComponent />);
DetectionEngine.displayName = 'DetectionEngine';
