/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { IndexPatternField } from './indexpattern';
import { DragDrop } from '../drag_drop';
import { FieldIcon } from './field_icon';
import { DataType } from '..';

export interface FieldItemProps {
  field: IndexPatternField;
  highlight?: string;
}

function wrapOnDot(str?: string) {
  return str ? str.replace(/\./g, '.\u200B') : undefined;
}

export function FieldItem({ field, highlight }: FieldItemProps) {
  const wrappableName = wrapOnDot(field.name)!;
  const wrappableHighlight = wrapOnDot(highlight);
  const highlightIndex = wrappableHighlight
    ? wrappableName.toLowerCase().indexOf(wrappableHighlight.toLowerCase())
    : -1;
  const wrappableHighlightableFieldName =
    highlightIndex < 0 ? (
      wrappableName
    ) : (
      <span>
        <span>{wrappableName.substr(0, highlightIndex)}</span>
        <strong>{wrappableName.substr(highlightIndex, wrappableHighlight!.length)}</strong>
        <span>{wrappableName.substr(highlightIndex + wrappableHighlight!.length)}</span>
      </span>
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
