/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { omit } from 'lodash';
import type {
  CatalogueChoiceGroup,
  CatalogueNamedFieldDefinition,
  CatalogueUiHints,
  CatalogueUiWidth,
} from '@kbn/streams-schema';
import { ChoiceGroupItem } from './choice_group_item';
import { applyChoice, findChoiceGroup, getSelectedChoice } from './choice_groups';
import { isFieldAvailable } from './conditions';
import { FieldRowItem } from './field_row_item';
import { useDefinitionFormContext } from './form_context';
import { layoutRows, orderFields } from './layout';
import { createChoiceValue } from './serialize';
import type { FormValue, ObjectValue } from './values';

interface FieldListProps {
  fields: readonly CatalogueNamedFieldDefinition[];
  choiceGroups?: readonly CatalogueChoiceGroup[];
  value: ObjectValue;
  onChange: (value: ObjectValue) => void;
  pointer: string;
}

/** What takes one place in a row: a field, or a choice group showing the member chosen in it. */
interface Cell {
  key: string;
  field?: CatalogueNamedFieldDefinition;
  group?: CatalogueChoiceGroup;
  ui?: CatalogueUiHints;
}

const DEFAULT_WIDTH: CatalogueUiWidth = 'm';

/** The share of a row each width takes, relative to the other cells of the row. */
const WIDTH_SHARE: Record<CatalogueUiWidth, 1 | 2 | 3 | 4 | 5> = {
  xs: 1,
  s: 2,
  m: 3,
  l: 4,
  xl: 5,
  full: 5,
};

/**
 * A choice group shows a select of its members next to the input of the chosen one, so it gets
 * the room of that select on top of the width the member asks for.
 */
const CHOICE_WIDTH_SHARE: Record<CatalogueUiWidth, 3 | 4 | 5 | 6 | 7> = {
  xs: 3,
  s: 4,
  m: 5,
  l: 6,
  xl: 7,
  full: 7,
};
const CHOICE_SELECT_UNITS = 8;

/** A cell narrower than this wraps onto the next line instead of squeezing its input. */
const cellStyles = ({ euiTheme }: UseEuiTheme, width: CatalogueUiWidth, isChoice: boolean) => {
  if (width === 'full') {
    return css`
      flex-basis: 100%;
    `;
  }
  const units =
    (width === 'xs' ? 6 : width === 's' ? 8 : 10) + (isChoice ? CHOICE_SELECT_UNITS : 0);
  return css`
    min-inline-size: calc(${euiTheme.size.base} * ${units});
  `;
};

/**
 * Renders the fields of one object scope as form rows. Fields that share a `ui.row` sit side by
 * side, sharing the line in proportion to their `ui.width`.
 */
export function FieldList({ fields, choiceGroups, value, onChange, pointer }: FieldListProps) {
  const context = useDefinitionFormContext();
  const euiThemeContext = useEuiTheme();
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

  const seenGroups = new Set<string>();
  const cells = ordered.flatMap((field): Cell[] => {
    const group = findChoiceGroup(choiceGroups, field.name);
    if (group) {
      if (seenGroups.has(group.id)) {
        return [];
      }
      seenGroups.add(group.id);
      // The group is laid out as the member it shows, or its first one while none is chosen.
      const shownName = getSelectedChoice(group, value) ?? group.fields[0];
      const shown = fields.find(({ name }) => name === shownName) ?? field;
      return [{ key: `group:${group.id}`, group, ui: shown.ui }];
    }
    return isFieldAvailable(field, value, context.telemetry)
      ? [{ key: field.name, field, ui: field.ui }]
      : [];
  });

  const renderCell = ({ field, group }: Cell, compact: boolean) => {
    if (group) {
      return (
        <ChoiceGroupItem
          group={group}
          fields={fields}
          value={value}
          pointer={pointer}
          selected={getSelectedChoice(group, value)}
          onSelect={onSelect}
          onFieldChange={onFieldChange}
          compact={compact}
        />
      );
    }
    return field ? (
      <FieldRowItem
        field={field}
        value={value}
        pointer={pointer}
        onFieldChange={onFieldChange}
        compact={compact}
      />
    ) : null;
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {layoutRows(cells).map((row) => {
        const [first] = row.cells;
        // A field alone on its line takes all of it, whatever width it asks for.
        if (row.cells.length === 1) {
          return (
            <EuiFlexItem key={first.key} grow={false}>
              {renderCell(first, false)}
            </EuiFlexItem>
          );
        }
        return (
          <EuiFlexItem key={`row:${row.id}`} grow={false}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="flexStart"
              responsive={false}
              wrap
              data-test-subj={`componentDefinitionFormFieldRow-${row.id}`}
            >
              {row.cells.map((cell) => {
                const width = cell.ui?.width ?? DEFAULT_WIDTH;
                return (
                  <EuiFlexItem
                    key={cell.key}
                    grow={(cell.group ? CHOICE_WIDTH_SHARE : WIDTH_SHARE)[width]}
                    css={cellStyles(euiThemeContext, width, cell.group !== undefined)}
                  >
                    {renderCell(cell, true)}
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
