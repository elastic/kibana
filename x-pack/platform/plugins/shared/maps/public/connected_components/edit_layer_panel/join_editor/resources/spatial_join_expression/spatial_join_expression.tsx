/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ExpressionPreview } from '../common/expression_preview';
import {
  ESDistanceSourceDescriptor,
  JoinSourceDescriptor,
} from '../../../../../../common/descriptor_types';
import { SpatialJoinPopoverContent } from './spatial_join_popover_content';

interface Props {
  sourceDescriptor: Partial<ESDistanceSourceDescriptor>;
  onSourceDescriptorChange: (sourceDescriptor: Partial<JoinSourceDescriptor>) => void;
}

export function SpatialJoinExpression(props: Props) {
  const { geoField } = props.sourceDescriptor;
  const expressionValue =
    geoField !== undefined
      ? i18n.translate('xpack.maps.spatialJoinExpression.value', {
          defaultMessage: 'features from {geoField}',
          values: { geoField },
        })
      : i18n.translate('xpack.maps.spatialJoinExpression.emptyValue', {
          defaultMessage: '-- configure spatial join --',
        });

  function renderDistancePopup() {
    return (
      <SpatialJoinPopoverContent
        sourceDescriptor={props.sourceDescriptor}
        onSourceDescriptorChange={props.onSourceDescriptorChange}
      />
    );
  }

  return (
    <ExpressionPreview
      previewText={expressionValue}
      renderPopup={renderDistancePopup}
      popOverId={props.sourceDescriptor.id}
    />
  );
}
