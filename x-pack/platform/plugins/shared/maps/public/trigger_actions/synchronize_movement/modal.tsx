/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiModalHeader,
  EuiModalBody,
  EuiModalHeaderTitle,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { mapEmbeddablesSingleton } from '../../react_embeddable/map_embeddables_singleton';

interface Props {
  onClose: () => void;
}

export class SynchronizeMovementModal extends Component<Props> {
  _renderSwitches() {
    const mapPanels = mapEmbeddablesSingleton.getMapPanels();

    const synchronizedPanels = mapPanels.filter((mapPanel) => {
      return mapPanel.getIsMovementSynchronized();
    });

    return mapPanels.map((mapPanel) => {
      const hasErrors = synchronizedPanels.length === 1 && mapPanel.getIsMovementSynchronized();
      return (
        <EuiFormRow
          display="columnCompressed"
          key={mapPanel.id}
          isInvalid={hasErrors}
          error={
            hasErrors
              ? [
                  i18n.translate('xpack.maps.synchronizeMovementModal.onlyOneMapSelectedError', {
                    defaultMessage: 'Select another map to synchronize map movement',
                  }),
                ]
              : []
          }
        >
          <EuiSwitch
            label={mapPanel.getTitle()}
            checked={mapPanel.getIsMovementSynchronized()}
            onChange={(event: EuiSwitchEvent) => {
              const isChecked = event.target.checked;
              if (!isChecked && synchronizedPanels.length === 2) {
                // Auto uncheck last 2 switches when second to last switch is unchecked
                synchronizedPanels.forEach((it) => {
                  it.setIsMovementSynchronized(false);
                });
              } else if (isChecked && mapPanels.length === 2) {
                // Auto check switches when there is only a pair of maps
                mapPanels.forEach((it) => {
                  it.setIsMovementSynchronized(true);
                });
              } else {
                mapPanel.setIsMovementSynchronized(isChecked);
              }
              this.forceUpdate();
            }}
            compressed
          />
        </EuiFormRow>
      );
    });
  }

  render() {
    return (
      <Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {i18n.translate('xpack.maps.synchronizeMovementAction.title', {
              defaultMessage: 'Synchronize map movement',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>{this._renderSwitches()}</EuiModalBody>
      </Fragment>
    );
  }
}
