/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { type MlEntityFieldOperation, ML_ENTITY_FIELD_OPERATIONS } from '@kbn/ml-anomaly-utils';

import { SINGLE_METRIC_VIEWER_ENTITY_FIELD_SELECTION_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { useMlKibana } from '../../contexts/kibana';
import type { MlEntity, SingleMetricViewerEmbeddableApi } from '../../../embeddables/types';
import { TimeSeriesExplorerHelpPopover } from '../timeseriesexplorer_help_popover';

const FilterButton: FC<{
  api: SingleMetricViewerEmbeddableApi;
  entity: MlEntity;
  operation: MlEntityFieldOperation;
}> = ({ api, entity, operation }) => {
  const {
    services: { uiActions },
  } = useMlKibana();
  const isAddFilter = operation === ML_ENTITY_FIELD_OPERATIONS.ADD;

  const onClick = useCallback(() => {
    uiActions.executeTriggerActions(SINGLE_METRIC_VIEWER_ENTITY_FIELD_SELECTION_TRIGGER, {
      embeddable: api,
      data: [
        {
          ...entity,
          operation: isAddFilter
            ? ML_ENTITY_FIELD_OPERATIONS.ADD
            : ML_ENTITY_FIELD_OPERATIONS.REMOVE,
        },
      ],
    });
  }, [api, entity, isAddFilter, uiActions]);

  return (
    <EuiToolTip
      content={
        isAddFilter ? (
          <FormattedMessage
            id="xpack.ml.timeSeriesExplorer.title.addFilterTooltip"
            defaultMessage="Filter for"
          />
        ) : (
          <FormattedMessage
            id="xpack.ml.timeSeriesExplorer.title.addNegateFilterTooltip"
            defaultMessage="Filter out"
          />
        )
      }
    >
      <EuiButtonIcon
        size="xs"
        onClick={onClick}
        iconType={isAddFilter ? 'plusInCircle' : 'minusInCircle'}
        aria-label={
          isAddFilter
            ? i18n.translate('xpack.ml.timeSeriesExplorer.title.addFilterAriaLabel', {
                defaultMessage: 'Filter for',
              })
            : i18n.translate('xpack.ml.timeSeriesExplorer.title.addNegateFilterAriaLabel', {
                defaultMessage: 'Filter out',
              })
        }
      />
    </EuiToolTip>
  );
};

interface SingleMetricViewerTitleProps {
  api?: SingleMetricViewerEmbeddableApi;
  entityData: { entities: MlEntity[]; count: number };
  functionLabel: string;
}

export const SingleMetricViewerTitle: FC<SingleMetricViewerTitleProps> = ({
  api,
  entityData,
  functionLabel,
}) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="none" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size={'xs'}>
              <h2>
                <span>
                  {i18n.translate('xpack.ml.timeSeriesExplorer.singleTimeSeriesAnalysisTitle', {
                    defaultMessage: 'Single time series analysis of {functionLabel}',
                    values: { functionLabel },
                  })}
                </span>
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TimeSeriesExplorerHelpPopover embeddableMode />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center">
          {entityData.entities.map((entity, i) => {
            return (
              <EuiFlexItem grow={false} key={`${entity.fieldName}.${entity.fieldValue}`}>
                <EuiFlexGroup gutterSize="none" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTextColor color="accentSecondary" component="span">
                      {`${entity.fieldName}: ${entity.fieldValue}`}
                    </EuiTextColor>
                  </EuiFlexItem>
                  {api !== undefined ? (
                    <>
                      <EuiFlexItem grow={false}>
                        <FilterButton
                          api={api}
                          entity={entity}
                          operation={ML_ENTITY_FIELD_OPERATIONS.ADD}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <FilterButton
                          api={api}
                          entity={entity}
                          operation={ML_ENTITY_FIELD_OPERATIONS.REMOVE}
                        />
                      </EuiFlexItem>
                    </>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
