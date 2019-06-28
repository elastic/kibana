/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { compose, withHandlers } from 'recompose';
import { notify } from '../../../lib/notify';
import { uploadWorkpad } from '../upload_workpad';
import { WorkpadDropzone as Component } from './workpad_dropzone';

export const WorkpadDropzone = compose(
  withHandlers({
    onDropAccepted: ({ onUpload }) => ([file]) => uploadWorkpad(file, onUpload),
    onDropRejected: () => ([file]) => {
      notify.warning('Only JSON files are accepted', {
        title: `Couldn't upload '${file.name || 'file'}'`,
      });
    },
  })
)(Component);

WorkpadDropzone.propTypes = {
  onUpload: PropTypes.func.isRequired,
};
