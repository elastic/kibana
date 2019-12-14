/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import classNames from 'classnames';
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
  _getPropertyLabel = propertyName => {
    if (!this.props.fields) {
      return propertyName;
    }

    const field = this.props.fields.find(field => {
      return field.name === propertyName;
    });

    return field && field.label ? field.label : propertyName;
  };

  _onAdd = properties => {
    if (!this.props.tooltipProperties) {
      this.props.onChange([...properties]);
    } else {
      this.props.onChange([...this.props.tooltipProperties, ...properties]);
    }
  };

  _removeProperty = index => {
    if (!this.props.tooltipProperties) {
      this.props.onChange([]);
    } else {
      const tooltipProperties = [...this.props.tooltipProperties];
      tooltipProperties.splice(index, 1);
      this.props.onChange(tooltipProperties);
    }
  };

  _onDragEnd = ({ source, destination }) => {
    // Dragging item out of EuiDroppable results in destination of null
    if (!destination) {
      return;
    }

    this.props.onChange(reorder(this.props.tooltipProperties, source.index, destination.index));
  };

  _renderProperties() {
    if (!this.props.tooltipProperties) {
      return null;
    }

    return (
      <EuiDragDropContext onDragEnd={this._onDragEnd}>
        <EuiDroppable droppableId="mapLayerTOC" spacing="none">
          {(provided, snapshot) =>
            this.props.tooltipProperties.map((propertyName, idx) => (
              <EuiDraggable
                spacing="none"
                key={propertyName}
                index={idx}
                draggableId={propertyName}
                customDragHandle={true}
                disableInteractiveElementBlocking // Allows button to be drag handle
              >
                {(provided, state) => (
                  <div
                    className={classNames('mapTooltipSelector__propertyRow', {
                      'mapTooltipSelector__propertyRow-isDragging': state.isDragging,
                      'mapTooltipSelector__propertyRow-isDraggingOver': snapshot.isDraggingOver,
                    })}
                  >
                    <EuiText className="mapTooltipSelector__propertyContent" size="s">
                      {this._getPropertyLabel(propertyName)}
                    </EuiText>
                    <div className="mapTooltipSelector__propertyIcons">
                      <EuiButtonIcon
                        iconType="trash"
                        color="danger"
                        onClick={this._removeProperty.bind(null, idx)}
                        title={i18n.translate('xpack.maps.tooltipSelector.trashButtonTitle', {
                          defaultMessage: 'Remove property',
                        })}
                        aria-label={i18n.translate(
                          'xpack.maps.tooltipSelector.trashButtonAriaLabel',
                          {
                            defaultMessage: 'Remove property',
                          }
                        )}
                      />
                      <EuiButtonIcon
                        className="mapTooltipSelector__grab"
                        iconType="grab"
                        color="subdued"
                        title={i18n.translate('xpack.maps.tooltipSelector.grabButtonTitle', {
                          defaultMessage: 'Reorder property',
                        })}
                        aria-label={i18n.translate(
                          'xpack.maps.tooltipSelector.grabButtonAriaLabel',
                          {
                            defaultMessage: 'Reorder property',
                          }
                        )}
                        {...provided.dragHandleProps}
                      />
                    </div>
                  </div>
                )}
              </EuiDraggable>
            ))
          }
        </EuiDroppable>
      </EuiDragDropContext>
    );
  }

  render() {
    const selectedFields = this.props.tooltipProperties
      ? this.props.tooltipProperties.map(propertyName => {
          return { name: propertyName };
        })
      : [];

    return (
      <div>
        <EuiTitle size="xxs">
          <h6>
            <FormattedMessage
              id="xpack.maps.tooltipSelectorLabel"
              defaultMessage="Fields to display in tooltip"
            />
          </h6>
        </EuiTitle>
        <EuiSpacer size="xs" />

        {this._renderProperties()}

        <EuiSpacer size="s" />

        <EuiTextAlign textAlign="center">
          <AddTooltipFieldPopover
            onAdd={this._onAdd}
            fields={this.props.fields}
            selectedFields={selectedFields}
          />
        </EuiTextAlign>
      </div>
    );
  }
}
