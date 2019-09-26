/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import fileSaver from 'file-saver';
import { notify } from './notify';
import * as workpadService from './workpad_service';

export const downloadWorkpad = async workpadId => {
  try {
    const workpad = await workpadService.get(workpadId);
    const jsonBlob = new Blob([JSON.stringify(workpad)], { type: 'application/json' });
    fileSaver.saveAs(jsonBlob, `canvas-workpad-${workpad.name}-${workpad.id}.json`);
  } catch (err) {
    notify.error(err, { title: `Couldn't download workpad` });
  }
};
