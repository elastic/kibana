/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import * as i18n from '../translations';
import { sourceDestinationFieldMappings } from '../map_config';
import { WithHoverActions } from '../../with_hover_actions';
import { HoverActionsContainer } from '../../page/add_to_kql';
import { getEmptyTagValue, getOrEmptyTagFromValue } from '../../empty_value';
import { DescriptionListStyled } from '../../page';
import { FeatureProperty } from '../types';
import { HostDetailsLink, IPDetailsLink } from '../../links';
import { DefaultFieldRenderer } from '../../field_renderers/field_renderers';

interface PointToolTipContentProps {
  contextId: string;
  featureProps: FeatureProperty[];
  featurePropsFilters: Record<string, object>;
  addFilters?(filter: object): void;
  closeTooltip?(): void;
}

export const PointToolTipContent = React.memo<PointToolTipContentProps>(
  ({ contextId, featureProps, featurePropsFilters, addFilters, closeTooltip }) => {
    const featureDescriptionListItems = featureProps.map(property => ({
      title: sourceDestinationFieldMappings[property._propertyKey],
      description: (
        <WithHoverActions
          data-test-subj={`hover-actions-${property._propertyKey}`}
          hoverContent={
            <HoverActionsContainer>
              <EuiToolTip content={i18n.FILTER_FOR_VALUE}>
                <EuiIcon
                  data-test-subj={`add-to-filter-${property._propertyKey}`}
                  type="filter"
                  onClick={() => {
                    if (closeTooltip != null && addFilters != null) {
                      closeTooltip();
                      addFilters(featurePropsFilters[property._propertyKey]);
                    }
                  }}
                />
              </EuiToolTip>
            </HoverActionsContainer>
          }
          render={() =>
            property._rawValue != null ? (
              <DefaultFieldRenderer
                rowItems={
                  Array.isArray(property._rawValue) ? property._rawValue : [property._rawValue]
                }
                attrName={property._propertyKey}
                idPrefix={`map-point-tooltip-${contextId}-${property._propertyKey}-${property._rawValue}`}
                render={item => getRenderedFieldValue(property._propertyKey, item)}
              />
            ) : (
              getEmptyTagValue()
            )
          }
        />
      ),
    }));

    return <DescriptionListStyled listItems={featureDescriptionListItems} />;
  }
);

PointToolTipContent.displayName = 'PointToolTipContent';

export const getRenderedFieldValue = (field: string, value: string) => {
  if (value === '') {
    return getOrEmptyTagFromValue(value);
  } else if (['host.name'].includes(field)) {
    return <HostDetailsLink hostName={value} />;
  } else if (['source.ip', 'destination.ip'].includes(field)) {
    return <IPDetailsLink ip={value} />;
  }
  return <>{value}</>;
};
