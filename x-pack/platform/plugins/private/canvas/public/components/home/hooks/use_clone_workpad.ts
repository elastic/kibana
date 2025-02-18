/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import { useNotifyService } from '../../../services';
import { getId } from '../../../lib/get_id';
import { getCanvasWorkpadService } from '../../../services/canvas_workpad_service';

export const useCloneWorkpad = () => {
  const notifyService = useNotifyService();
  const history = useHistory();

  return useCallback(
    async (workpadId: string) => {
      const workpadService = getCanvasWorkpadService();
      try {
        let workpad = await workpadService.get(workpadId);

        workpad = {
          ...workpad,
          name: strings.getClonedWorkpadName(workpad.name),
          id: getId('workpad'),
        };

        await workpadService.create(workpad);

        history.push(`/workpad/${workpad.id}/page/1`);
      } catch (err) {
        notifyService.error(err, { title: errors.getCloneFailureErrorMessage() });
      }
    },
    [notifyService, history]
  );
};

const strings = {
  getClonedWorkpadName: (workpadName: string) =>
    i18n.translate('xpack.canvas.useCloneWorkpad.clonedWorkpadName', {
      defaultMessage: 'Copy of {workpadName}',
      values: {
        workpadName,
      },
      description:
        'This suffix is added to the end of the name of a cloned workpad to indicate that this ' +
        'new workpad is a copy of the original workpad. Example: "Copy of Sales Pitch"',
    }),
};

const errors = {
  getCloneFailureErrorMessage: () =>
    i18n.translate('xpack.canvas.error.useCloneWorkpad.cloneFailureErrorMessage', {
      defaultMessage: `Couldn't clone workpad`,
    }),
};
