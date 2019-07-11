/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenu,
  EuiSelectable,
  EuiHighlight,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DRAW_TYPE } from '../../../actions/map_actions';

const RESET_STATE = {
  isPopoverOpen: false,
  drawType: null
};

export class ToolsControl extends Component {

  state = {
    ...RESET_STATE
  };

  _togglePopover = () => {
    this.setState(prevState => ({
      ...RESET_STATE,
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState(RESET_STATE);
  };

  _onIndexPatternSelection = (options) => {
    const selection = options.find((option) => option.checked);
    this._initiateDraw(
      this.state.drawType,
      selection.value
    );
  };

  _initiateDraw = (drawType, indexContext) => {
    this.props.initiateDraw({
      drawType,
      ...indexContext
    });
    this._closePopover();
  };

  _selectPolygonDrawType = () => {
    this.setState({ drawType: DRAW_TYPE.POLYGON });
  }

  _selectBoundsDrawType = () => {
    this.setState({ drawType: DRAW_TYPE.BOUNDS });
  }

  _getDrawPanels() {

    const needsIndexPatternSelectionPanel = this.props.uniqueIndexPatternsAndGeoFields.length > 1;

    const drawPolygonAction = {
      name: i18n.translate('xpack.maps.toolbarOverlay.drawShapeLabel', {
        defaultMessage: 'Draw shape to filter data',
      }),
      onClick: needsIndexPatternSelectionPanel
        ? this._selectPolygonDrawType
        : () => {
          this._initiateDraw(DRAW_TYPE.POLYGON, this.props.uniqueIndexPatternsAndGeoFields[0]);
        },
      panel: needsIndexPatternSelectionPanel
        ? this._getIndexPatternSelectionPanel(1)
        : undefined
    };

    const drawBoundsAction = {
      name: i18n.translate('xpack.maps.toolbarOverlay.drawBoundsLabel', {
        defaultMessage: 'Draw bounds to filter data',
      }),
      onClick: needsIndexPatternSelectionPanel
        ? this._selectBoundsDrawType
        : () => {
          this._initiateDraw(DRAW_TYPE.BOUNDS, this.props.uniqueIndexPatternsAndGeoFields[0]);
        },
      panel: needsIndexPatternSelectionPanel
        ? this._getIndexPatternSelectionPanel(2)
        : undefined
    };

    return flattenPanelTree({
      id: 0,
      title: i18n.translate('xpack.maps.toolbarOverlay.tools.toolbarTitle', {
        defaultMessage: 'Tools',
      }),
      items: [drawPolygonAction, drawBoundsAction]
    });
  }

  _getIndexPatternSelectionPanel(id) {
    const options = this.props.uniqueIndexPatternsAndGeoFields.map((indexPatternAndGeoField) => {
      return {
        label: `${indexPatternAndGeoField.indexPatternTitle} : ${indexPatternAndGeoField.geoField}`,
        value: indexPatternAndGeoField
      };
    });

    const renderGeoField = (option, searchValue) => {
      return (
        <Fragment>
          <EuiTextColor color="subdued">
            <small>
              <EuiHighlight search={searchValue}>{option.value.indexPatternTitle}</EuiHighlight>
            </small>
          </EuiTextColor>
          <br />
          <EuiHighlight search={searchValue}>
            {option.value.geoField}
          </EuiHighlight>
        </Fragment>
      );
    };

    const indexPatternSelection = (
      <EuiSelectable
        searchable
        searchProps={{
          placeholder: i18n.translate('xpack.maps.toolbarOverlay.indexPattern.filterListTitle', {
            defaultMessage: 'Filter list',
          }),
          compressed: true,
        }}
        options={options}

        onChange={this._onIndexPatternSelection}
        renderOption={renderGeoField}
        listProps={{
          rowHeight: 50,
          showIcons: false,
        }}
      >
        {(list, search) => (
          <div>
            {search}
            {list}
          </div>
        )}
      </EuiSelectable>
    );

    return {
      id: id,
      title: i18n.translate('xpack.maps.toolbarOverlay.geofield.toolbarTitle', {
        defaultMessage: 'Select geo field',
      }),
      content: indexPatternSelection
    };
  }

  _renderToolsButton() {
    return (
      <EuiButtonIcon
        className="mapToolbarOverlay__button"
        color="text"
        iconType="wrench"
        onClick={this._togglePopover}
        aria-label={i18n.translate('xpack.maps.toolbarOverlay.toolsControlTitle', {
          defaultMessage: 'Tools',
        })}
        title={i18n.translate('xpack.maps.toolbarOverlay.toolsControlTitle', {
          defaultMessage: 'Tools',
        })}
      />
    );
  }

  render() {
    return (
      <EuiPopover
        id="contextMenu"
        button={this._renderToolsButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        panelPaddingSize="none"
        withTitle
        anchorPosition="leftUp"
      >
        <EuiContextMenu
          initialPanelId={0}
          panels={this._getDrawPanels()}
        />
      </EuiPopover>
    );
  }
}

function flattenPanelTree(tree, array = []) {
  array.push(tree);

  if (tree.items) {
    tree.items.forEach(item => {
      if (item.panel) {
        flattenPanelTree(item.panel, array);
        item.panel = item.panel.id;
      }
    });
  }

  return array;
}
