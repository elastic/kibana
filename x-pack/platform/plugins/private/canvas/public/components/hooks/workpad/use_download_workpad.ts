/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import fileSaver from 'file-saver';
import { i18n } from '@kbn/i18n';
import { useNotifyService } from '../../../services';
import type { CanvasWorkpad } from '../../../../types';
import { getCanvasWorkpadService } from '../../../services/canvas_workpad_service';

const strings = {
  getDownloadFailureErrorMessage: () =>
    i18n.translate('xpack.canvas.error.downloadWorkpad.downloadFailureErrorMessage', {
      defaultMessage: "Couldn't download workpad",
    }),
};

export const useDownloadWorkpad = () => {
  const notifyService = useNotifyService();
  const download = useDownloadWorkpadBlob();

  return useCallback(
    async (workpadId: string) => {
      try {
        const workpadService = getCanvasWorkpadService();
        const workpad = await workpadService.get(workpadId);

        download(workpad, `canvas-workpad-${workpad.name}-${workpad.id}`);
      } catch (err) {
        notifyService.error(err, { title: strings.getDownloadFailureErrorMessage() });
      }
    },
    [notifyService, download]
  );
};

const useDownloadWorkpadBlob = () => {
  return useCallback((workpad: CanvasWorkpad, filename: string) => {
    const jsonBlob = new Blob([JSON.stringify(workpad)], { type: 'application/json' });
    fileSaver.saveAs(jsonBlob, `${filename}.json`);
  }, []);
};
