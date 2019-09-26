/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, MouseEvent } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiToolTip } from '@elastic/eui';

interface Props {
  /**
   * A click handler for the delete button
   */
  onDelete: (event: MouseEvent) => void;
  /**
   * A click handler for the edit button
   */
  onEdit: (event: MouseEvent) => void;
}

export const ElementControls: FunctionComponent<Props> = ({ onDelete, onEdit }) => (
  <EuiFlexGroup
    className="canvasElementCard__controls"
    gutterSize="xs"
    justifyContent="spaceBetween"
  >
    <EuiFlexItem grow={false}>
      <EuiToolTip content="Edit">
        <EuiButtonIcon iconType="pencil" aria-label="Edit element" onClick={onEdit} />
      </EuiToolTip>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiToolTip content="Delete">
        <EuiButtonIcon
          color="danger"
          iconType="trash"
          aria-label="Delete element"
          onClick={onDelete}
        />
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);

ElementControls.propTypes = {
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
};
