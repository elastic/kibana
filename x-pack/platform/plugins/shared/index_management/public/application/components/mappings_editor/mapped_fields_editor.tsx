/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { EuiSpacer } from '@elastic/eui';

import type { DocLinksStart } from '@kbn/core/public';
import type { FieldSourceNameChange } from '@kbn/index-management-shared-types';

import { parseMappings } from '../../shared/parse_mappings';
import { DocumentFields, MultipleMappingsWarning } from './components';
import { DocumentFieldsHeader } from './components/document_fields/document_fields_header';
import { SearchResult } from './components/document_fields/search_fields';
import { useConfig } from './config_context';
import type { MappingsEditorParsedMetadata } from './mappings_editor';
import { useDispatch, useMappingsState } from './mappings_state_context';
import type { IndexSettings, Mappings, OnUpdateHandler } from './types';
import { useMappingsStateListener } from './use_state_listener';

export interface MappedFieldsEditorProps {
  onChange: OnUpdateHandler;
  value?: { [key: string]: unknown };
  compressed?: boolean;
  fieldEditDisplay?: 'flyout' | 'inline';
  fieldsDescription?: React.ReactNode;
  afterFieldsDescription?: React.ReactNode;
  showFieldSearch?: boolean;
  allowMultiFields?: boolean;
  showFieldRename?: boolean;
  sourceNameField?: {
    label: string;
    helpText?: string;
    placeholder?: string;
    requiredErrorMessage?: string;
  };
  fieldSourceNames?: Record<string, string>;
  onFieldSourceNameChange?: (change: FieldSourceNameChange) => void;
  autoOpenCreateFieldWhenEmpty?: boolean;
  allowedRootFieldTypes?: readonly string[];
  closeCreateFieldOnOutsideClick?: boolean;
  autoFocusCreateFieldType?: boolean;
  inlineOptionalDateFormatField?: {
    label: string;
    helpText?: string;
    placeholder?: string;
  };
  indexSettings?: IndexSettings;
  docLinks: DocLinksStart;
}

export const MappedFieldsEditor = React.memo(
  ({
    onChange,
    value,
    compressed,
    fieldEditDisplay,
    fieldsDescription,
    afterFieldsDescription,
    showFieldSearch = true,
    allowMultiFields = true,
    showFieldRename,
    sourceNameField,
    fieldSourceNames,
    onFieldSourceNameChange,
    autoOpenCreateFieldWhenEmpty,
    allowedRootFieldTypes,
    closeCreateFieldOnOutsideClick,
    autoFocusCreateFieldType,
    inlineOptionalDateFormatField,
    indexSettings,
    docLinks,
  }: MappedFieldsEditorProps) => {
    const { parsedDefaultValue, multipleMappingsDeclared } =
      useMemo<MappingsEditorParsedMetadata>(() => parseMappings(value), [value]);

    useMappingsStateListener({
      onChange,
      value: parsedDefaultValue,
      autoOpenCreateFieldWhenEmpty,
    });

    const { update: updateConfig } = useConfig();
    const state = useMappingsState();
    const dispatch = useDispatch();
    const onFieldSourceNameChangeRef = useRef(onFieldSourceNameChange);
    onFieldSourceNameChangeRef.current = onFieldSourceNameChange;

    const stableOnFieldSourceNameChange = useCallback((change: FieldSourceNameChange) => {
      onFieldSourceNameChangeRef.current?.(change);
    }, []);

    useEffect(() => {
      if (multipleMappingsDeclared) {
        onChange({
          getData: () => value! as Mappings,
          validate: () => Promise.resolve(true),
          isValid: true,
        });
      }
    }, [multipleMappingsDeclared, onChange, value]);

    const syncConfig = useCallback(() => {
      updateConfig({
        docLinks,
        indexSettings: indexSettings ?? {},
        fieldEditDisplay,
        allowMultiFields,
        showFieldRename,
        sourceNameField,
        fieldSourceNames,
        onFieldSourceNameChange: showFieldRename ? stableOnFieldSourceNameChange : undefined,
        allowedRootFieldTypes,
        closeCreateFieldOnOutsideClick,
        autoFocusCreateFieldType,
        inlineOptionalDateFormatField,
      });
    }, [
      updateConfig,
      docLinks,
      indexSettings,
      fieldEditDisplay,
      allowMultiFields,
      showFieldRename,
      sourceNameField,
      fieldSourceNames,
      stableOnFieldSourceNameChange,
      allowedRootFieldTypes,
      closeCreateFieldOnOutsideClick,
      autoFocusCreateFieldType,
      inlineOptionalDateFormatField,
    ]);

    useLayoutEffect(() => {
      syncConfig();
    }, [syncConfig]);

    const onSearchChange = useCallback(
      (searchValue: string) => {
        dispatch({ type: 'search:update', value: searchValue });
      },
      [dispatch]
    );

    if (multipleMappingsDeclared) {
      return <MultipleMappingsWarning />;
    }

    /** When field search is off, `false` omits the header row (including the default docs blurb). */
    const hideDocumentFieldsHeader = showFieldSearch === false && fieldsDescription === false;

    return (
      <div data-test-subj="mappedFieldsEditor">
        <DocumentFields
          searchComponent={
            <>
              {hideDocumentFieldsHeader ? null : (
                <DocumentFieldsHeader
                  searchValue={state.search.term}
                  onSearchChange={onSearchChange}
                  compressed={compressed}
                  description={fieldsDescription === false ? undefined : fieldsDescription}
                  showFieldSearch={showFieldSearch}
                />
              )}
              {afterFieldsDescription}
              {afterFieldsDescription ? null : <EuiSpacer size="m" />}
            </>
          }
          searchResultComponent={
            showFieldSearch && state.search.term.trim() !== '' ? (
              <SearchResult
                result={state.search.result}
                documentFieldsState={state.documentFields}
              />
            ) : undefined
          }
        />
      </div>
    );
  }
);
