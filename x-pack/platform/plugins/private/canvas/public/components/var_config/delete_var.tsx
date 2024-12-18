/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import {
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CanvasVariable } from '../../../types';

const strings = {
  getCancelButtonLabel: () =>
    i18n.translate('xpack.canvas.varConfigDeleteVar.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
  getDeleteButtonLabel: () =>
    i18n.translate('xpack.canvas.varConfigDeleteVar.deleteButtonLabel', {
      defaultMessage: 'Delete variable',
    }),
  getTitle: () =>
    i18n.translate('xpack.canvas.varConfigDeleteVar.titleLabel', {
      defaultMessage: 'Delete variable?',
    }),
  getWarningDescription: () =>
    i18n.translate('xpack.canvas.varConfigDeleteVar.warningDescription', {
      defaultMessage:
        'Deleting this variable may adversely affect the workpad. Are you sure you wish to continue?',
    }),
};

interface Props {
  selectedVar: CanvasVariable;
  onDelete: (v: CanvasVariable) => void;
  onCancel: () => void;
}

export const DeleteVar: FC<Props> = ({ selectedVar, onCancel, onDelete }) => {
  return (
    <React.Fragment>
      <div className="canvasVarHeader__triggerWrapper">
        <button className="canvasVarHeader__button" type="button" onClick={() => onCancel()}>
          <span className="canvasVarHeader__iconWrapper">
            <EuiIcon type="sortLeft" style={{ verticalAlign: 'top' }} />
          </span>
          <span>
            <span className="canvasVarHeader__anchor">{strings.getTitle()}</span>
          </span>
        </button>
      </div>
      <div className="canvasSidebar__accordionContent">
        <div>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="s">
                {strings.getWarningDescription()}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                color="danger"
                size="s"
                fill
                onClick={() => onDelete(selectedVar)}
                iconType="trash"
              >
                {strings.getDeleteButtonLabel()}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" onClick={() => onCancel()}>
                {strings.getCancelButtonLabel()}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    </React.Fragment>
  );
};
