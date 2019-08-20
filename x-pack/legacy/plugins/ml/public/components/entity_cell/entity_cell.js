/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';


function getAddFilter({ entityName, entityValue, filter }) {
  return (
    <EuiToolTip
      content={<FormattedMessage
        id="xpack.ml.anomaliesTable.entityCell.addFilterTooltip"
        defaultMessage="Add filter"
      />}
    >
      <EuiButtonIcon
        size="xs"
        className="filter-button"
        onClick={() => filter(entityName, entityValue, '+')}
        iconType="plusInCircle"
        aria-label={i18n.translate('xpack.ml.anomaliesTable.entityCell.addFilterAriaLabel', {
          defaultMessage: 'Add filter'
        })}
      />
    </EuiToolTip>
  );
}

function getRemoveFilter({ entityName, entityValue, filter }) {
  return (
    <EuiToolTip
      content={<FormattedMessage
        id="xpack.ml.anomaliesTable.entityCell.removeFilterTooltip"
        defaultMessage="Remove filter"
      />}
    >
      <EuiButtonIcon
        size="xs"
        className="filter-button"
        onClick={() => filter(entityName, entityValue, '-')}
        iconType="minusInCircle"
        aria-label={i18n.translate('xpack.ml.anomaliesTable.entityCell.removeFilterAriaLabel', {
          defaultMessage: 'Remove filter'
        })}
      />
    </EuiToolTip>
  );
}

/*
 * Component for rendering an entity, displaying the value
 * of the entity, such as a partitioning or influencer field value, and optionally links for
 * adding or removing a filter on this entity.
 */
export const EntityCell = function EntityCell({
  entityName,
  entityValue,
  filter,
  wrapText = false
}) {
  const valueText = (entityName !== 'mlcategory') ? entityValue : `mlcategory ${entityValue}`;
  const textStyle = { maxWidth: '100%' };
  const textWrapperClass = (wrapText ? 'field-value-long' : 'field-value-short');
  const shouldDisplayIcons = (filter !== undefined && entityName !== undefined && entityValue !== undefined);

  if (wrapText === true) {
    return (
      <div>
        <span className={textWrapperClass}>{valueText}</span>
        {shouldDisplayIcons &&
          <React.Fragment>
            {getAddFilter({ entityName, entityValue, filter })}
            {getRemoveFilter({ entityName, entityValue, filter })}
          </React.Fragment>
        }
      </div>
    );
  } else {
    return (
      <EuiFlexGroup
        direction="row"
        alignItems="center"
        gutterSize="none"
      >
        <EuiFlexItem grow={false} style={textStyle}>
          <EuiText
            size="xs"
            className={textWrapperClass}
          >
            {valueText}
          </EuiText>
        </EuiFlexItem>
        {shouldDisplayIcons &&
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                {getAddFilter({ entityName, entityValue, filter })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {getRemoveFilter({ entityName, entityValue, filter })}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        }
      </EuiFlexGroup>
    );
  }
};

EntityCell.propTypes = {
  entityName: PropTypes.string,
  entityValue: PropTypes.any,
  filter: PropTypes.func,
  wrapText: PropTypes.bool
};
