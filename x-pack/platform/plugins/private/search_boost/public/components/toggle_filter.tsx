/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { Query } from '@elastic/eui';
import { EuiFilterButton, EuiToolTip } from '@elastic/eui';
import type { ActiveFilters, FieldDefinition } from '@kbn/content-list-provider';
import { useContentListFilters } from '@kbn/content-list-provider';
import { filter, useFieldQueryFilter } from '@kbn/content-list-toolbar';

interface ToggleFilterConfig<V extends string> {
  fieldName: string;
  values: readonly V[];
  labels: Readonly<Record<V, string>>;
  disabledReasons?: Readonly<Record<V, string>>;
  'data-test-subj': string;
}

/** The values of the rows the other filters leave, to count what each button would show. */
type GetRowValues<V extends string> = (filters: ActiveFilters) => readonly V[];

/**
 * Toggle buttons for one field, such as "Indices" / "Data streams", each with how many rows it
 * would show. A button with nothing to show is disabled unless it's already on.
 */
export const createToggleFilter = <V extends string>({
  fieldName,
  values,
  labels,
  disabledReasons,
  'data-test-subj': dataTestSubj,
}: ToggleFilterConfig<V>) => {
  const RowValuesContext = createContext<GetRowValues<V>>(() => []);

  const fieldDefinition: FieldDefinition = {
    fieldName,
    resolveIdToDisplay: (id) => id,
    resolveDisplayToId: (display) => values.find((value) => value === display),
  };

  const ToggleFilterControl = ({
    query,
    onChange,
  }: {
    query?: Query;
    onChange?: (query: Query) => void;
  }) => {
    const { filters } = useContentListFilters();
    const rowValues = useContext(RowValuesContext)({ ...filters, [fieldName]: undefined });
    const counts = new Map<V, number>();
    for (const rowValue of rowValues) {
      counts.set(rowValue, (counts.get(rowValue) ?? 0) + 1);
    }
    const { getState, toggle } = useFieldQueryFilter({
      fieldName,
      query,
      onChange,
      singleSelection: true,
    });

    return (
      <>
        {values.map((value, index) => {
          const isActive = getState(value) === 'include';
          const count = counts.get(value) ?? 0;
          const isDisabled = count === 0 && !isActive;
          const button = (
            <EuiFilterButton
              key={value}
              isToggle
              isSelected={isActive}
              hasActiveFilters={isActive}
              numFilters={count}
              isDisabled={isDisabled}
              hasAriaDisabled={Boolean(disabledReasons)}
              withNext={index < values.length - 1}
              onClick={() => toggle(value, 'include')}
              data-test-subj={`${dataTestSubj}-${value}`}
            >
              {labels[value]}
            </EuiFilterButton>
          );
          return isDisabled && disabledReasons ? (
            <EuiToolTip key={value} content={disabledReasons[value]}>
              {button}
            </EuiToolTip>
          ) : (
            button
          );
        })}
      </>
    );
  };

  return {
    ToggleFilter: filter.createComponent({
      resolve: () => ({ type: 'custom_component' as const, component: ToggleFilterControl }),
    }),
    fieldDefinition,
    RowValuesProvider: RowValuesContext.Provider,
  };
};
