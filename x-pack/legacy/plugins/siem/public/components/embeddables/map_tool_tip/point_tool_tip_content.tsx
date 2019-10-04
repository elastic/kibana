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
import { DefaultDraggable } from '../../draggables';
import { getEmptyTagValue, getOrEmptyTagFromValue } from '../../empty_value';
import { DescriptionListStyled } from '../../page';
import { FeatureProperty } from '../types';

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
          hoverContent={
            <HoverActionsContainer data-test-subj="hover-actions-container">
              <EuiToolTip content={i18n.FILTER_FOR_VALUE}>
                <EuiIcon
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
              <DefaultDraggable
                data-test-subj="port"
                field={property._propertyKey}
                id={`map-point-tooltip-${contextId}-${property._propertyKey}-${property._rawValue}`}
                tooltipContent={property._propertyKey}
                value={property._rawValue}
              >
                {getOrEmptyTagFromValue(property._rawValue)}
              </DefaultDraggable>
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
