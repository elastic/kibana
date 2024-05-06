/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

// @ts-expect-error
import { getDefaultWorkpad } from '../../../state/defaults';
import { useNotifyService, useWorkpadService } from '../../../services';

import type { CanvasWorkpad } from '../../../../types';

export const useCreateWorkpad = () => {
  const workpadService = useWorkpadService();
  const notifyService = useNotifyService();
  const history = useHistory();

  return useCallback(
    async (_workpad?: CanvasWorkpad | null) => {
      const workpad = _workpad || (getDefaultWorkpad() as CanvasWorkpad);

      try {
        await workpadService.create(workpad);
        history.push(`/workpad/${workpad.id}/page/1`);
      } catch (err) {
        notifyService.error(err, {
          title: errors.getCreateFailureErrorMessage(),
        });
      }
      return;
    },
    [notifyService, history, workpadService]
  );
};

const errors = {
  getCreateFailureErrorMessage: () =>
    i18n.translate('xpack.canvas.error.useCreateWorkpad.createFailureErrorMessage', {
      defaultMessage: `Couldn't create workpad`,
    }),
};
