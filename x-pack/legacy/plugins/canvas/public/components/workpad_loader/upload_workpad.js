/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getId } from '../../lib/get_id';
import { notify } from '../../lib/notify';
import { ErrorStrings } from '../../../i18n';

const { WorkpadFileUpload: errors } = ErrorStrings;

export const uploadWorkpad = (file, onUpload) => {
  if (!file) {
    return;
  }

  if (get(file, 'type') !== 'application/json') {
    return notify.warning(errors.getAcceptJSONOnlyErrorMessage(), {
      title: file.name
        ? errors.getFileUploadFailureWithFileNameErrorMessage(file.name)
        : errors.getFileUploadFailureWithoutFileNameErrorMessage(),
    });
  }
  // TODO: Clean up this file, this loading stuff can, and should be, abstracted
  const reader = new FileReader();

  // handle reading the uploaded file
  reader.onload = () => {
    try {
      const workpad = JSON.parse(reader.result);
      workpad.id = getId('workpad');

      // sanity check for workpad object
      if (!Array.isArray(workpad.pages) || workpad.pages.length === 0 || !workpad.assets) {
        throw new Error(errors.getMissingPropertiesErrorMessage());
      }

      onUpload(workpad);
    } catch (e) {
      notify.error(e, {
        title: file.name
          ? errors.getFileUploadFailureWithFileNameErrorMessage(file.name)
          : errors.getFileUploadFailureWithoutFileNameErrorMessage(),
      });
    }
  };

  // read the uploaded file
  reader.readAsText(file);
};
