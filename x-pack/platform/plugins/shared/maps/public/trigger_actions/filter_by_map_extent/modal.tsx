/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
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
  title: string;
}

export class FilterByMapExtentModal extends Component<Props> {
  _renderSwitches() {
    return mapEmbeddablesSingleton.getMapPanels().map((mapPanel) => {
      return (
        <EuiFormRow display="columnCompressed" key={mapPanel.id}>
          <EuiSwitch
            label={mapPanel.getTitle()}
            checked={mapPanel.getIsFilterByMapExtent()}
            onChange={(event: EuiSwitchEvent) => {
              const isChecked = event.target.checked;
              mapPanel.setIsFilterByMapExtent(isChecked);

              // only a single map can create map bound filter at a time
              // disable all other map panels from creating map bound filter
              if (isChecked) {
                mapEmbeddablesSingleton.getMapPanels().forEach((it) => {
                  if (it.id !== mapPanel.id && it.getIsFilterByMapExtent()) {
                    it.setIsFilterByMapExtent(false);
                  }
                });
              }
              this.forceUpdate();
            }}
            compressed
            data-test-subj={`filterByMapExtentSwitch${mapPanel.id}`}
          />
        </EuiFormRow>
      );
    });
  }

  render() {
    return (
      <Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{this.props.title}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>{this._renderSwitches()}</EuiModalBody>
      </Fragment>
    );
  }
}
