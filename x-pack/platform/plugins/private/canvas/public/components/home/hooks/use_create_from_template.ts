/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { CanvasTemplate } from '../../../../types';
import { useNotifyService } from '../../../services';
import { getCanvasWorkpadService } from '../../../services/canvas_workpad_service';

export const useCreateFromTemplate = () => {
  const notifyService = useNotifyService();
  const history = useHistory();

  return useCallback(
    async (template: CanvasTemplate) => {
      const workpadService = getCanvasWorkpadService();
      try {
        const result = await workpadService.createFromTemplate(template.id);
        history.push(`/workpad/${result.id}/page/1`);
      } catch (e) {
        notifyService.error(e, {
          title: `Couldn't create workpad from template`,
        });
      }
    },
    [notifyService, history]
  );
};
