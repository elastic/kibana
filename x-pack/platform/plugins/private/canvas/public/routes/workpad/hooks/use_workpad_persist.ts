/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { useSelector } from 'react-redux';
import type { CanvasWorkpad, State } from '../../../../types';
import { getWorkpad } from '../../../state/selectors/workpad';
import { canUserWrite } from '../../../state/selectors/app';
import { notifyError } from '../../../lib/assets';
import { getCanvasWorkpadService } from '../../../services/canvas_workpad_service';

export const useWorkpadPersist = () => {
  // Watch for workpad state and then persist those changes
  const [workpad, canWrite]: [CanvasWorkpad, boolean] = useSelector((state: State) => [
    getWorkpad(state),
    canUserWrite(state),
  ]);

  const previousWorkpad = usePrevious(workpad);

  const workpadChanged = previousWorkpad && workpad !== previousWorkpad;

  // The server stamps `@timestamp` on every save, while local edits leave it
  // untouched. So a changed `@timestamp` means this workpad was (re)loaded from
  // the server (e.g. by the auto-refresh reload) rather than edited locally —
  // persisting it would echo a server reload straight back, so we skip it.
  const reloadedFromServer = Boolean(
    previousWorkpad && workpad['@timestamp'] !== previousWorkpad['@timestamp']
  );

  useEffect(() => {
    if (canWrite) {
      if (workpadChanged && !reloadedFromServer) {
        getCanvasWorkpadService()
          .updateWorkpad(workpad.id, workpad)
          .catch((err) => {
            notifyError(err);
          });
      }
    }
  }, [workpad, workpadChanged, reloadedFromServer, canWrite]);
};
