/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';

import type { DocLinksStart } from '@kbn/core/public';

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
  indexSettings?: IndexSettings;
  docLinks: DocLinksStart;
}

export const MappedFieldsEditor = React.memo(
  ({ onChange, value, indexSettings, docLinks }: MappedFieldsEditorProps) => {
    const { parsedDefaultValue, multipleMappingsDeclared } =
      useMemo<MappingsEditorParsedMetadata>(() => parseMappings(value), [value]);

    useMappingsStateListener({ onChange, value: parsedDefaultValue });

    const { update: updateConfig } = useConfig();
    const state = useMappingsState();
    const dispatch = useDispatch();

    useEffect(() => {
      if (multipleMappingsDeclared) {
        onChange({
          getData: () => value! as Mappings,
          validate: () => Promise.resolve(true),
          isValid: true,
        });
      }
    }, [multipleMappingsDeclared, onChange, value]);

    useEffect(() => {
      updateConfig({
        docLinks,
        indexSettings: indexSettings ?? {},
      });
    }, [updateConfig, docLinks, indexSettings]);

    const onSearchChange = useCallback(
      (searchValue: string) => {
        dispatch({ type: 'search:update', value: searchValue });
      },
      [dispatch]
    );

    if (multipleMappingsDeclared) {
      return <MultipleMappingsWarning />;
    }

    return (
      <div data-test-subj="mappedFieldsEditor">
        <DocumentFields
          searchComponent={
            <>
              <DocumentFieldsHeader
                searchValue={state.search.term}
                onSearchChange={onSearchChange}
              />
              <EuiSpacer size="m" />
            </>
          }
          searchResultComponent={
            state.search.term.trim() !== '' ? (
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
