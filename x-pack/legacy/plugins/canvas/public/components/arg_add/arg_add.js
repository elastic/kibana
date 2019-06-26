/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';

export const ArgAdd = ({ onValueAdd, displayName, help }) => {
  return (
    <button className="canvasArg__add" onClick={onValueAdd}>
      <EuiDescriptionList compressed>
        <EuiDescriptionListTitle>{displayName}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <small>{help}</small>
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </button>
  );
};

ArgAdd.propTypes = {
  displayName: PropTypes.string,
  help: PropTypes.string,
  onValueAdd: PropTypes.func,
};
