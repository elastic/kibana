/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { omit } from 'lodash';
import type { CatalogueChoiceGroup, CatalogueNamedFieldDefinition } from '@kbn/streams-schema';
import { ChoiceGroupItem } from './choice_group_item';
import { applyChoice, findChoiceGroup, getSelectedChoice } from './choice_groups';
import { isFieldAvailable } from './conditions';
import { FieldRowItem } from './field_row_item';
import { useDefinitionFormContext } from './form_context';
import { orderFields } from './layout';
import { createChoiceValue } from './serialize';
import type { FormValue, ObjectValue } from './values';

interface FieldListProps {
  fields: readonly CatalogueNamedFieldDefinition[];
  choiceGroups?: readonly CatalogueChoiceGroup[];
  value: ObjectValue;
  onChange: (value: ObjectValue) => void;
  pointer: string;
}

/** Renders the fields of one object scope as stacked form rows. */
export function FieldList({ fields, choiceGroups, value, onChange, pointer }: FieldListProps) {
  const context = useDefinitionFormContext();
  const ordered = useMemo(() => orderFields(fields), [fields]);

  const onFieldChange = useCallback(
    (name: string, fieldValue: FormValue | undefined) => {
      const rest = omit(value, name);
      onChange(fieldValue === undefined ? rest : { ...rest, [name]: fieldValue });
    },
    [onChange, value]
  );

  const onSelect = useCallback(
    (group: CatalogueChoiceGroup, fieldName: string | undefined) => {
      const member = fields.find(({ name }) => name === fieldName);
      const initial = member ? createChoiceValue(member, context) : '';
      onChange(applyChoice(group, value, fieldName, initial));
    },
    [context, fields, onChange, value]
  );

  const renderedGroups = new Set<string>();
  return (
    <>
      {ordered.flatMap((field) => {
        const group = findChoiceGroup(choiceGroups, field.name);
        if (group) {
          if (renderedGroups.has(group.id)) {
            return [];
          }
          renderedGroups.add(group.id);
          return [
            <ChoiceGroupItem
              key={`group:${group.id}`}
              group={group}
              fields={fields}
              value={value}
              pointer={pointer}
              selected={getSelectedChoice(group, value)}
              onSelect={onSelect}
              onFieldChange={onFieldChange}
            />,
          ];
        }
        if (!isFieldAvailable(field, value, context.telemetry)) {
          return [];
        }
        return [
          <FieldRowItem
            key={field.name}
            field={field}
            value={value}
            pointer={pointer}
            onFieldChange={onFieldChange}
          />,
        ];
      })}
    </>
  );
}
