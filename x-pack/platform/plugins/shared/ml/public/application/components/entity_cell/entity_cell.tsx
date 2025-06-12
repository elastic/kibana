/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ML_ENTITY_FIELD_OPERATIONS, MLCATEGORY } from '@kbn/ml-anomaly-utils';
import { useEntityCellStyles } from './entity_cell_styles';
import { EMPTY_FIELD_VALUE_LABEL } from '../../timeseriesexplorer/components/entity_control/entity_control';
import { blurButtonOnClick } from '../../util/component_utils';

export type EntityCellFilter = (
  entityName: string,
  entityValue: string,
  direction: '+' | '-'
) => void;

interface EntityCellProps {
  entityName: string;
  entityValue: string;
  filter?: EntityCellFilter;
  wrapText?: boolean;
}

const AddFilter: FC<EntityCellProps> = ({ entityName, entityValue, filter }) => {
  const { filterButton } = useEntityCellStyles();

  if (filter === undefined) {
    return null;
  }

  return (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.ml.anomaliesTable.entityCell.addFilterTooltip"
          defaultMessage="Add filter"
        />
      }
    >
      <EuiButtonIcon
        size="s"
        data-test-subj={`mlAnomaliesTableEntityCellAddFilterButton-${entityValue}`}
        css={filterButton}
        onClick={blurButtonOnClick(() => {
          filter(entityName, entityValue, ML_ENTITY_FIELD_OPERATIONS.ADD);
        })}
        iconType="plusInCircle"
        aria-label={i18n.translate('xpack.ml.anomaliesTable.entityCell.addFilterAriaLabel', {
          defaultMessage: 'Add filter',
        })}
      />
    </EuiToolTip>
  );
};

const RemoveFilter: FC<EntityCellProps> = ({ entityName, entityValue, filter }) => {
  const { filterButton } = useEntityCellStyles();

  if (filter === undefined) {
    return null;
  }

  return (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.ml.anomaliesTable.entityCell.removeFilterTooltip"
          defaultMessage="Remove filter"
        />
      }
    >
      <EuiButtonIcon
        size="s"
        data-test-subj={`mlAnomaliesTableEntityCellRemoveFilterButton-${entityValue}`}
        css={filterButton}
        onClick={blurButtonOnClick(() => {
          filter(entityName, entityValue, ML_ENTITY_FIELD_OPERATIONS.REMOVE);
        })}
        iconType="minusInCircle"
        aria-label={i18n.translate('xpack.ml.anomaliesTable.entityCell.removeFilterAriaLabel', {
          defaultMessage: 'Remove filter',
        })}
      />
    </EuiToolTip>
  );
};

/*
 * Component for rendering an entity, displaying the value
 * of the entity, such as a partitioning or influencer field value, and optionally links for
 * adding or removing a filter on this entity.
 */
export const EntityCell: FC<EntityCellProps> = ({
  entityName,
  entityValue,
  filter,
  wrapText = false,
}) => {
  let valueText = entityValue === '' ? <i>{EMPTY_FIELD_VALUE_LABEL}</i> : entityValue;
  if (entityName === MLCATEGORY) {
    valueText = `${MLCATEGORY} ${valueText}`;
  }

  const { fieldValueShort, fieldValueLong } = useEntityCellStyles();
  const textStyle = { maxWidth: '100%' };
  const textWrapperCss = wrapText ? fieldValueLong : fieldValueShort;
  const shouldDisplayIcons =
    filter !== undefined && entityName !== undefined && entityValue !== undefined;

  if (wrapText === true) {
    return (
      <div>
        <span css={textWrapperCss}>{valueText}</span>
        {shouldDisplayIcons && (
          <>
            <AddFilter entityName={entityName} entityValue={entityValue} filter={filter} />
            <RemoveFilter entityName={entityName} entityValue={entityValue} filter={filter} />
          </>
        )}
      </div>
    );
  } else {
    return (
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false} style={textStyle}>
          <EuiText size="xs" css={textWrapperCss}>
            {valueText}
          </EuiText>
        </EuiFlexItem>
        {shouldDisplayIcons && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                <AddFilter entityName={entityName} entityValue={entityValue} filter={filter} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <RemoveFilter entityName={entityName} entityValue={entityValue} filter={filter} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
};
