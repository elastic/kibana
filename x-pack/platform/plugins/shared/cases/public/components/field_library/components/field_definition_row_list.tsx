/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { FieldDefinitionRow } from './field_definition_row';
import { FieldDefinitionRowHeader } from './field_definition_row_header';

interface FieldDefinitionRowListProps {
  fieldDefinitions: FieldDefinition[];
  parseInlineField: (definition: string) => InlineField | undefined;
  onEdit: (fieldDefinition: FieldDefinition) => void;
  onDelete: (fieldDefinition: FieldDefinition) => void;
  emptyMessage: React.ReactNode;
  dataTestSubj: string;
}

/** An unordered group of field definitions, rendered with the same row as the ordered group. */
export const FieldDefinitionRowList: React.FC<FieldDefinitionRowListProps> = ({
  fieldDefinitions,
  parseInlineField,
  onEdit,
  onDelete,
  emptyMessage,
  dataTestSubj,
}) => {
  // The wrapper (and its test subject) renders in both states so consumers — including FTR
  // tests waiting on an empty library — have a stable marker that the list mounted.
  return (
    <div data-test-subj={dataTestSubj}>
      {fieldDefinitions.length === 0 ? (
        // An empty list shell reads as "something failed to load"; a sentence reads as "there is
        // nothing here yet", which is the actual state.
        <EuiText size="s" color="subdued" data-test-subj={`${dataTestSubj}Empty`}>
          <p>{emptyMessage}</p>
        </EuiText>
      ) : (
        <>
          <FieldDefinitionRowHeader />
          {fieldDefinitions.map((fieldDefinition, index) => (
            <FieldDefinitionRow
              key={fieldDefinition.fieldDefinitionId}
              fieldDefinition={fieldDefinition}
              inlineField={parseInlineField(fieldDefinition.definition)}
              onEdit={onEdit}
              onDelete={onDelete}
              isFirst={index === 0}
            />
          ))}
        </>
      )}
    </div>
  );
};

FieldDefinitionRowList.displayName = 'FieldDefinitionRowList';
