/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { sourceDestinationFieldMappings } from '../map_config';
import {
  AddFilterToGlobalSearchBar,
  createFilter,
} from '../../page/add_filter_to_global_search_bar';
import { getEmptyTagValue, getOrEmptyTagFromValue } from '../../empty_value';
import { DescriptionListStyled } from '../../page';
import { FeatureProperty } from '../types';
import { HostDetailsLink, IPDetailsLink } from '../../links';
import { DefaultFieldRenderer } from '../../field_renderers/field_renderers';
import { FlowTarget } from '../../../graphql/types';

interface PointToolTipContentProps {
  contextId: string;
  featureProps: FeatureProperty[];
  closeTooltip?(): void;
}

export const PointToolTipContentComponent = ({
  contextId,
  featureProps,
  closeTooltip,
}: PointToolTipContentProps) => {
  const featureDescriptionListItems = featureProps.map(
    ({ _propertyKey: key, _rawValue: value }) => ({
      title: sourceDestinationFieldMappings[key],
      description: (
        <AddFilterToGlobalSearchBar
          filter={createFilter(key, Array.isArray(value) ? value[0] : value)}
          onFilterAdded={closeTooltip}
          data-test-subj={`add-to-kql-${key}`}
        >
          {value != null ? (
            <DefaultFieldRenderer
              rowItems={Array.isArray(value) ? value : [value]}
              attrName={key}
              idPrefix={`map-point-tooltip-${contextId}-${key}-${value}`}
              render={item => getRenderedFieldValue(key, item)}
            />
          ) : (
            getEmptyTagValue()
          )}
        </AddFilterToGlobalSearchBar>
      ),
    })
  );

  return <DescriptionListStyled listItems={featureDescriptionListItems} />;
};

PointToolTipContentComponent.displayName = 'PointToolTipContentComponent';

export const PointToolTipContent = React.memo(PointToolTipContentComponent);

PointToolTipContent.displayName = 'PointToolTipContent';

export const getRenderedFieldValue = (field: string, value: string) => {
  if (value === '') {
    return getOrEmptyTagFromValue(value);
  } else if (['host.name'].includes(field)) {
    return <HostDetailsLink hostName={value} />;
  } else if (['source.ip', 'destination.ip'].includes(field)) {
    const flowTarget = field.split('.')[0] as FlowTarget;
    return <IPDetailsLink ip={value} flowTarget={flowTarget} />;
  }
  return <>{value}</>;
};
