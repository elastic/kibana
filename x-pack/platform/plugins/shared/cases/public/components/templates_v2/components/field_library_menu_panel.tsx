/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelectable,
  EuiText,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { useGetFieldDefinitions } from '../../field_library/hooks/use_get_field_definitions';
import {
  getDefinedFieldNames,
  getFieldItemMaps,
  parseTemplateDocument,
} from '../utils/template_yaml_ast';
import * as i18n from '../translations';

interface FieldLibraryMenuPanelProps {
  owner?: string;
  /** Current editor YAML — used to mark fields already referenced by the template. */
  existingYaml: string;
  onSelect: (fieldName: string) => void;
  /** Width shared with the parent popover panels so the menu doesn't resize-jump. */
  width: number;
}

/**
 * The Field library branch of the Actions menu: a searchable, single-select list of the space's
 * saved field definitions. Selecting one links it into the template as a `{ $ref }` entry (via the
 * menu's `onSelect`). Fields already referenced by the template are shown as checked + disabled so
 * they cannot be added twice. The library query is shared (same query key) with the editor's `$ref`
 * autocomplete, so opening this panel usually resolves from cache.
 */
export const FieldLibraryMenuPanel: React.FC<FieldLibraryMenuPanelProps> = ({
  owner,
  existingYaml,
  onSelect,
  width,
}) => {
  const { data, isLoading } = useGetFieldDefinitions({ owner, staleTime: Infinity });

  const alreadyLinked = useMemo(() => {
    const doc = parseTemplateDocument(existingYaml);
    return doc ? getDefinedFieldNames(getFieldItemMaps(doc)) : new Set<string>();
  }, [existingYaml]);

  const options = useMemo<EuiSelectableOption[]>(
    () =>
      (data?.fieldDefinitions ?? []).map((field) => ({
        label: field.name,
        key: field.fieldDefinitionId,
        // `checked: 'on'` + disabled communicates "already in this template" without a second column.
        checked: alreadyLinked.has(field.name) ? 'on' : undefined,
        disabled: alreadyLinked.has(field.name),
        append: field.isGlobal ? (
          <EuiBadge color="hollow">{i18n.ACTIONS_MENU_LIBRARY_GLOBAL_BADGE}</EuiBadge>
        ) : undefined,
        data: { name: field.name },
      })),
    [data, alreadyLinked]
  );

  if (isLoading) {
    return (
      <EuiPanel hasShadow={false} paddingSize="l" css={css({ width })}>
        <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s" responsive={false}>
          <EuiLoadingSpinner size="m" />
          <EuiText size="s" color="subdued" aria-live="polite">
            {i18n.ACTIONS_MENU_LOADING_LIBRARY}
          </EuiText>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (options.length === 0) {
    return (
      <EuiEmptyPrompt
        css={css({ width })}
        iconType="indexOpen"
        paddingSize="m"
        titleSize="xs"
        title={<h4>{i18n.ACTIONS_MENU_NO_LIBRARY_FIELDS_TITLE}</h4>}
        body={
          <EuiText size="s" color="subdued">
            {i18n.ACTIONS_MENU_NO_LIBRARY_FIELDS}
          </EuiText>
        }
      />
    );
  }

  return (
    <EuiSelectable
      aria-label={i18n.ACTION_FIELD_LIBRARY_TITLE}
      searchable
      singleSelection
      searchProps={{
        placeholder: i18n.ACTIONS_MENU_SEARCH_FIELDS,
        'aria-label': i18n.ACTIONS_MENU_SEARCH_FIELDS,
        compressed: true,
        'data-test-subj': 'templateActionsMenu-fieldLibrary-search',
      }}
      options={options}
      onChange={(nextOptions, _event, changedOption) => {
        // Only fire on a real selection (not the initial render or search typing).
        if (changedOption?.checked === 'on') {
          const name = (changedOption.data as { name?: string } | undefined)?.name;
          if (name) {
            onSelect(name);
          }
        }
      }}
      listProps={{ bordered: false, 'data-test-subj': 'templateActionsMenu-fieldLibrary-list' }}
      css={css({ width })}
    >
      {(list, search) => (
        <>
          {search}
          {list}
        </>
      )}
    </EuiSelectable>
  );
};

FieldLibraryMenuPanel.displayName = 'FieldLibraryMenuPanel';
