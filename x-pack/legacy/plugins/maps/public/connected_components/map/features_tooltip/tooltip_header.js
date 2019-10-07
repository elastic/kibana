/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import {
  EuiButtonIcon,
  EuiPagination,
  EuiSelect,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export function TooltipHeader({
  closeTooltip,
  features,
  isLocked,
  layers,
  pageNumber,
  onFilterByLayer,
  onPageChange,
  selectedLayerFilter,
}) {

  const headerItems = [];

  // Pagination controls
  if (isLocked && features.length > 1) {
    headerItems.push(
      <EuiFlexItem grow={false} key="pagination">
        <EuiPagination
          pageCount={features.length}
          activePage={pageNumber}
          onPageClick={onPageChange}
          compressed
        />
      </EuiFlexItem>
    );
  }

  // Page number readout
  if (features.length > 1) {
    headerItems.push(
      <EuiFlexItem key="pageNumber">
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="xpack.maps.tooltip.pageNumerText"
            defaultMessage="{pageNumber} of {total} features"
            values={{
              pageNumber: pageNumber + 1,
              total: features.length
            }}
          />
        </EuiTextColor>
      </EuiFlexItem>
    );
  }

  // Layer select
  if (isLocked && layers && layers.length > 1) {
    const options = [
      {
        value: ALL_LAYERS,
        text: i18n.translate('xpack.maps.tooltip.allLayersLabel', {
          defaultMessage: 'All layers'
        })
      },
      ...layers.map(({ id, displayName, count }) => {
        return {
          value: id,
          text: `(${count}) ${displayName}`
        };
      })
    ];
    headerItems.push(
      <EuiFlexItem key="layerSelect">
        <EuiSelect
          options={options}
          onChange={onFilterByLayer}
          value={selectedLayerFilter}
          compressed
          fullWidth
          aria-label={i18n.translate('xpack.maps.tooltip.layerFilterLabel', {
            defaultMessage: 'Filter results by layer'
          })}
        />
      </EuiFlexItem>
    );
  }

  // Close button
  if (isLocked) {
    // When close button is the only item, add empty FlexItem to push close button to right
    if (headerItems.length === 0) {
      headerItems.push(<EuiFlexItem key="spacer"></EuiFlexItem>);
    }

    headerItems.push(
      <EuiFlexItem grow={false} key="closeButton">
        <EuiButtonIcon
          onClick={closeTooltip}
          iconType="cross"
          aria-label={i18n.translate('xpack.maps.tooltip.closeAriaLabel', {
            defaultMessage: 'Close tooltip'
          })}
          data-test-subj="mapTooltipCloseButton"
        />
      </EuiFlexItem>
    );
  }

  if (headerItems.length === 0) {
    return null;
  }

  return (
    <Fragment>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        {headerItems}
      </EuiFlexGroup>

      <EuiHorizontalRule margin="xs"/>
    </Fragment>
  );
}
