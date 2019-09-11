/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { IndexPattern, IndexPatternField, DraggedField } from './indexpattern';
import { DragDrop } from '../drag_drop';
import { FieldIcon } from './field_icon';
import { DataType } from '..';

export interface FieldItemProps {
  field: IndexPatternField;
  indexPattern: IndexPattern;
  highlight?: string;
  exists: boolean;
}

function wrapOnDot(str?: string) {
  // u200B is a non-width white-space character, which allows
  // the browser to efficiently word-wrap right after the dot
  // without us having to draw a lot of extra DOM elements, etc
  return str ? str.replace(/\./g, '.\u200B') : '';
}

export function FieldItem({ field, indexPattern, highlight, exists }: FieldItemProps) {
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
        <strong>{wrappableName.substr(highlightIndex, wrappableHighlight.length)}</strong>
        <span>{wrappableName.substr(highlightIndex + wrappableHighlight.length)}</span>
      </span>
    );

  return (
    <DragDrop
      value={{ field, indexPatternId: indexPattern.id } as DraggedField}
      data-test-subj="lnsFieldListPanelField"
      draggable
      className={`lnsFieldListPanel__field lnsFieldListPanel__field-btn-${
        field.type
      } lnsFieldListPanel__field--${exists ? 'exists' : 'missing'}`}
    >
      <div className="lnsFieldListPanel__fieldInfo">
        <FieldIcon type={field.type as DataType} />

        <span className="lnsFieldListPanel__fieldName" title={field.name}>
          {wrappableHighlightableFieldName}
        </span>
      </div>
    </DragDrop>
  );
}
