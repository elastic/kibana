/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';

import { Field, Aggregation, SplitField } from '../../../../../../../../common/types/fields';

interface DetectorTitleProps {
  index: number;
  agg: Aggregation;
  field: Field;
  splitField: SplitField;
  deleteDetector?: (dtrIds: number) => void;
}

export const DetectorTitle: FC<DetectorTitleProps> = ({
  index,
  agg,
  field,
  splitField,
  deleteDetector,
}) => {
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <span style={{ fontSize: 'small' }}>{getTitle(agg, field, splitField)}</span>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {deleteDetector !== undefined && (
          <EuiButtonIcon
            color={'danger'}
            onClick={() => deleteDetector(index)}
            iconType="cross"
            size="s"
            aria-label="Next"
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

function getTitle(agg: Aggregation, field: Field, splitField: SplitField): string {
  // let title = ${agg.title}(${field.name})`;
  // if (splitField !== null) {
  //   title += ` split by ${splitField.name}`;
  // }
  // return title;
  return `${agg.title}(${field.name})`;
}
