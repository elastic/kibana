/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import fileSaver from 'file-saver';
import { API_ROUTE_SHAREABLE_RUNTIME_DOWNLOAD } from '../../common/lib/constants';
import { ErrorStrings } from '../../i18n';
// @ts-ignore untyped local
import { notify } from './notify';
// @ts-ignore untyped local
import * as workpadService from './workpad_service';
import { CanvasRenderedWorkpad } from '../../shareable_runtime/types';

const { downloadWorkpad: strings } = ErrorStrings;

export const downloadWorkpad = async (workpadId: string) => {
  try {
    const workpad = await workpadService.get(workpadId);
    const jsonBlob = new Blob([JSON.stringify(workpad)], { type: 'application/json' });
    fileSaver.saveAs(jsonBlob, `canvas-workpad-${workpad.name}-${workpad.id}.json`);
  } catch (err) {
    notify.error(err, { title: strings.getDownloadFailureErrorMessage() });
  }
};

export const downloadRenderedWorkpad = async (renderedWorkpad: CanvasRenderedWorkpad) => {
  try {
    const jsonBlob = new Blob([JSON.stringify(renderedWorkpad)], { type: 'application/json' });
    fileSaver.saveAs(
      jsonBlob,
      `canvas-embed-workpad-${renderedWorkpad.name}-${renderedWorkpad.id}.json`
    );
  } catch (err) {
    notify.error(err, { title: strings.getDownloadRenderedWorkpadFailureErrorMessage() });
  }
};

export const downloadRuntime = async (basePath: string) => {
  try {
    const path = `${basePath}${API_ROUTE_SHAREABLE_RUNTIME_DOWNLOAD}`;
    window.open(path);
    return;
  } catch (err) {
    notify.error(err, { title: strings.getDownloadRuntimeFailureErrorMessage() });
  }
};

export const downloadZippedRuntime = async (data: any) => {
  try {
    const zip = new Blob([data], { type: 'octet/stream' });
    fileSaver.saveAs(zip, 'canvas-workpad-embed.zip');
  } catch (err) {
    notify.error(err, { title: strings.getDownloadZippedRuntimeFailureErrorMessage() });
  }
};
