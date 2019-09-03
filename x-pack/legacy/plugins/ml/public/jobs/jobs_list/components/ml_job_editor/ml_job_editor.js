/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiCodeEditor
} from '@elastic/eui';

export const EDITOR_MODE = { TEXT: 'text', JSON: 'json' };

export function MLJobEditor({
  value,
  height = '500px',
  width = '100%',
  mode = EDITOR_MODE.JSON,
  readOnly = false,
  syntaxChecking = true,
  onChange = () => {}
}) {
  return (
    <EuiCodeEditor
      value={value}
      width={width}
      height={height}
      mode={mode}
      readOnly={readOnly}
      wrapEnabled={true}
      showPrintMargin={false}
      editorProps={{ $blockScrolling: true }}
      setOptions={{ useWorker: syntaxChecking }}
      onChange={onChange}
    />
  );
}
MLJobEditor.propTypes = {
  value: PropTypes.string.isRequired,
  height: PropTypes.string,
  width: PropTypes.string,
  mode: PropTypes.string,
  readOnly: PropTypes.bool,
  onChange: PropTypes.func,
};
