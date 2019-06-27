/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  // @ts-ignore
  EuiHighlight,
} from '@elastic/eui';
import { IndexPatternField } from './indexpattern';
import { DragDrop } from '../drag_drop';
import { FieldIcon } from './field_icon';
import { DataType } from '../types';

export interface FieldItemProps {
  field: IndexPatternField;
  highlight?: string;
}

function highglightedPart(completeHighlight: string | undefined, part: string) {
  if (!completeHighlight) {
    return '';
  }

  if (completeHighlight.includes(part)) {
    return part;
  }

  const highlightParts = completeHighlight.split('.').filter(highlightPart => highlightPart !== '');

  const lastHighlightPart = highlightParts[highlightParts.length - 1];
  if (part.startsWith(lastHighlightPart)) {
    return lastHighlightPart;
  }

  const firstHighlightPart = highlightParts[0];
  if (part.endsWith(firstHighlightPart)) {
    return firstHighlightPart;
  }

  return completeHighlight;
}

export function FieldItem({ field, highlight }: FieldItemProps) {
  const fieldParts = field.name.split('.');
  const wrappableHighlightableFieldName = _.flatten(
    fieldParts.map((part, index) => [
      <span key={index}>
        <EuiHighlight search={highglightedPart(highlight, part)}>{part}</EuiHighlight>
        {index !== fieldParts.length - 1 ? '.' : ''}
      </span>,
      index !== fieldParts.length - 1 ? <wbr key={`${index}-wbr`} /> : null,
    ])
  );

  return (
    <DragDrop
      value={field}
      draggable
      className={`lnsFieldListPanel__field lnsFieldListPanel__field-btn-${field.type}`}
    >
      <FieldIcon type={field.type as DataType} />
      <span className="lnsFieldListPanel__fieldName" title={field.name}>
        {wrappableHighlightableFieldName}
      </span>
    </DragDrop>
  );
}
