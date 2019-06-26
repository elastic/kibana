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
  draggable: boolean;
  highlight?: string;
}

export function FieldItem({ field, highlight, draggable }: FieldItemProps) {
  const fieldParts = (
    field.name + '.fsdfsd.sdfsdfs.sdfsdfsd.fsdfsfsd.fsdfsdfsd.dsfsdfsdfsd.sdfsdfsdf.sdfsdf'
  ).split('.');
  const item = (
    <>
      <FieldIcon type={field.type as DataType} />
      <span className="lnsFieldListPanel__fieldName" title={field.name}>
        {_.flatten(
          fieldParts.map((part, index) => [
            <span key={part}>
              <EuiHighlight
                // TODO solve in a sane way
                search={
                  highlight && highlight.includes(part)
                    ? part
                    : highlight && part.startsWith(highlight.split('.').reverse()[0])
                    ? highlight.split('.').reverse()[0]
                    : highlight
                }
              >
                {part}
              </EuiHighlight>
              {index !== fieldParts.length - 1 ? '.' : ''}
            </span>,
            index !== fieldParts.length - 1 ? <wbr key={`${part}-wbr`} /> : null,
          ])
        )}
      </span>
    </>
  );
  const className = `lnsFieldListPanel__field lnsFieldListPanel__field-btn-${field.type}`;

  if (draggable) {
    return (
      <DragDrop value={field} draggable className={className}>
        {item}
      </DragDrop>
    );
  } else {
    return <div className={className}>{item}</div>;
  }
}
