/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiButtonIcon,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiText,
  EuiTextAlign,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { AddTooltipFieldPopover } from './add_tooltip_field_popover';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

// TODO import reorder from EUI once its exposed as service
// https://github.com/elastic/eui/issues/2372
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

export class TooltipSelector extends Component {

  _addProperty = (propertyName) => {
    //const property = { name: propertyName };
    const property = propertyName;
    if (!this.props.tooltipProperties) {
      this.props.onChange([property]);
    } else {
      this.props.onChange([...this.props.tooltipProperties, property]);
    }
  }

  _onDragEnd = ({ source, destination }) => {
    // Dragging item out of EuiDroppable results in destination of null
    if (!destination) {
      return;
    }

    this.props.onChange(reorder(this.props.tooltipProperties, source.index, destination.index));
  };

  _renderProperties() {
    console.log(this.props.tooltipProperties);
    if (!this.props.tooltipProperties) {
      return null;
    }

    return (
      <EuiDragDropContext onDragEnd={this._onDragEnd}>
        <EuiDroppable droppableId="mapLayerTOC" spacing="none">
          {() => (
            this.props.tooltipProperties.map((propertyName, idx) => (
              <EuiDraggable
                spacing="none"
                key={propertyName}
                index={idx}
                draggableId={propertyName}
                customDragHandle={true}
                disableInteractiveElementBlocking // Allows button to be drag handle
              >
                {(provided) => (
                  <div className="mapTooltipSelector__propertyRow">
                    <EuiText className="mapTooltipSelector__propertyContent">
                      {propertyName}
                    </EuiText>
                    <div className="mapTooltipSelector__propertyIcons">
                      <EuiButtonIcon
                        className="mapTooltipSelector__grab"
                        iconType="grab"
                        color="subdued"
                        title={i18n.translate('xpack.maps.tooltipSelector.grabButtonTitle', {
                          defaultMessage: 'Reorder tooltip properties'
                        })}
                        aria-label={i18n.translate('xpack.maps.tooltipSelector.grabButtonAriaLabel', {
                          defaultMessage: 'Reorder tooltip properties'
                        })}
                        {...provided.dragHandleProps}
                      />
                    </div>
                  </div>
                )}
              </EuiDraggable>
            ))
          )}
        </EuiDroppable>
      </EuiDragDropContext>
    );
  }

  render() {
    return (
      <div>
        <EuiTitle size="xxs">
          <h6>
            <FormattedMessage id="xpack.maps.tooltipSelectorLabel" defaultMessage="Fields to display in tooltip" />
          </h6>
        </EuiTitle>
        <EuiSpacer size="xs" />

        {this._renderProperties()}

        <EuiTextAlign textAlign="center">
          <AddTooltipFieldPopover
            onSelect={this._addProperty}
            fields={this.props.fields}
          />
        </EuiTextAlign>
      </div>
    );
  }
}
