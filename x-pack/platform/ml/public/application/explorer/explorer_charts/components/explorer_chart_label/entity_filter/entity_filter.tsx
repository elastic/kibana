/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { MlEntityFieldOperation } from '@kbn/ml-anomaly-utils';
import { ML_ENTITY_FIELD_OPERATIONS } from '@kbn/ml-anomaly-utils';
import { blurButtonOnClick } from '../../../../../util/component_utils';
import './_entity_filter.scss';

interface EntityFilterProps {
  onFilter: (params: {
    influencerFieldName: string;
    influencerFieldValue: string;
    action: MlEntityFieldOperation;
  }) => void;
  influencerFieldName: string;
  influencerFieldValue: string;
}
export const EntityFilter: FC<EntityFilterProps> = ({
  onFilter,
  influencerFieldName,
  influencerFieldValue,
}) => {
  return (
    <React.Fragment>
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.ml.entityFilter.addFilterTooltip"
            defaultMessage="Add filter"
          />
        }
      >
        <EuiButtonIcon
          size="s"
          className="filter-button"
          onClick={blurButtonOnClick(() => {
            onFilter({
              influencerFieldName,
              influencerFieldValue,
              action: ML_ENTITY_FIELD_OPERATIONS.ADD,
            });
          })}
          iconType="plusInCircle"
          aria-label={i18n.translate('xpack.ml.entityFilter.addFilterAriaLabel', {
            defaultMessage: 'Add filter for {influencerFieldName} {influencerFieldValue}',
            values: { influencerFieldName, influencerFieldValue },
          })}
        />
      </EuiToolTip>
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.ml.entityFilter.removeFilterTooltip"
            defaultMessage="Remove filter"
          />
        }
      >
        <EuiButtonIcon
          size="s"
          className="filter-button"
          onClick={blurButtonOnClick(() => {
            onFilter({
              influencerFieldName,
              influencerFieldValue,
              action: ML_ENTITY_FIELD_OPERATIONS.REMOVE,
            });
          })}
          iconType="minusInCircle"
          aria-label={i18n.translate('xpack.ml.entityFilter.removeFilterAriaLabel', {
            defaultMessage: 'Remove filter for {influencerFieldName} {influencerFieldValue}',
            values: { influencerFieldName, influencerFieldValue },
          })}
        />
      </EuiToolTip>
    </React.Fragment>
  );
};
