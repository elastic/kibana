/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './legacy';
import { useMemo } from 'react';

import { getCanvasNotifyService } from './canvas_notify_service';

export const useNotifyService = () => {
  const canvasNotifyService = useMemo(() => getCanvasNotifyService(), []);
  return canvasNotifyService;
};
