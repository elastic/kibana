/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiBadge,
  EuiSpacer,
  EuiFieldSearch,
  EuiHorizontalRule,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import { useGetFieldDefinitions } from '../hooks/use_get_field_definitions';
import * as i18n from '../translations';

interface FieldLibraryPanelProps {
  owner: string[];
  onInsert: (fieldDefinitionYaml: string) => void;
  /** When provided, a "Reference" button is shown alongside the "Copy" button. */
  onReference?: (fieldName: string) => void;
  /** Field names that are currently referenced in the template. */
  activeRefNames?: string[];
  /** Called when the user clicks Unlink on an active reference. */
  onUnlink?: (fieldName: string) => void;
}

export const FieldLibraryPanel: React.FC<FieldLibraryPanelProps> = ({
  owner,
  onInsert,
  onReference,
  activeRefNames,
  onUnlink,
}) => {
  const { euiTheme } = useEuiTheme();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useGetFieldDefinitions({ owner });

  const fieldDefinitions = useMemo(() => data?.fieldDefinitions ?? [], [data]);
  const hasReferenceMode = !!onReference;

  const linkedFields = useMemo(
    () =>
      activeRefNames && activeRefNames.length > 0
        ? activeRefNames.flatMap((name) => {
            const fd = fieldDefinitions.find((d) => d.name === name);
            return fd ? [fd] : [];
          })
        : [],
    [activeRefNames, fieldDefinitions]
  );

  const filtered = useMemo(() => {
    const trimmed = search.trim();
    if (!trimmed) return fieldDefinitions;
    const lower = trimmed.toLowerCase();
    return fieldDefinitions.filter(
      (fd) => fd.name.toLowerCase().includes(lower) || fd.description?.toLowerCase().includes(lower)
    );
  }, [search, fieldDefinitions]);

  const handleInsert = useCallback(
    (fd: FieldDefinition) => {
      onInsert(fd.definition);
    },
    [onInsert]
  );

  const handleReference = useCallback(
    (fd: FieldDefinition) => {
      onReference?.(fd.name);
    },
    [onReference]
  );

  const handleUnlink = useCallback(
    (fd: FieldDefinition) => {
      onUnlink?.(fd.name);
    },
    [onUnlink]
  );

  const panelStyles = css({
    borderTop: `1px solid ${euiTheme.colors.lightShade}`,
    padding: `${euiTheme.size.m} ${euiTheme.size.m} 0`,
    height: '100%',
    overflowY: 'auto',
  });

  const rowStyles = css({
    padding: `${euiTheme.size.xs} 0`,
    borderBottom: `1px solid ${euiTheme.colors.lightestShade}`,
    '&:last-child': {
      borderBottom: 'none',
    },
  });

  const renderFieldRow = (
    fd: FieldDefinition,
    actions: React.ReactNode,
    testSubj: string = 'fieldLibraryRow'
  ) => (
    <div key={fd.fieldDefinitionId} css={rowStyles} data-test-subj={testSubj}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{fd.name}</strong>
              </EuiText>
            </EuiFlexItem>
            {fd.description && (
              <EuiFlexItem>
                <EuiText size="xs">
                  <EuiTextColor color="subdued">{fd.description}</EuiTextColor>
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="fieldLibraryOwnerBadge">
            {fd.owner}
          </EuiBadge>
        </EuiFlexItem>
        {actions}
      </EuiFlexGroup>
    </div>
  );

  return (
    <EuiAccordion
      id="field-library-panel"
      buttonContent={
        <EuiTitle size="xs">
          <h3>{i18n.FIELD_LIBRARY_PANEL_TITLE}</h3>
        </EuiTitle>
      }
      paddingSize="none"
      initialIsOpen={true}
      data-test-subj="fieldLibraryPanel"
    >
      <div css={panelStyles}>
        {isLoading ? (
          <EuiFlexGroup justifyContent="center" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : fieldDefinitions.length === 0 ? (
          <EuiEmptyPrompt
            iconType="database"
            title={<h3>{i18n.FIELD_LIBRARY_PANEL_TITLE}</h3>}
            body={<EuiText size="s">{i18n.FIELD_LIBRARY_PANEL_EMPTY}</EuiText>}
            titleSize="xs"
          />
        ) : (
          <>
            {linkedFields.length > 0 && (
              <>
                <EuiText size="xs">
                  <strong>{i18n.LINKED_FIELDS_SECTION_TITLE}</strong>
                </EuiText>
                <EuiSpacer size="xs" />
                {linkedFields.map((fd) =>
                  renderFieldRow(
                    fd,
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="unlink"
                        aria-label={i18n.UNLINK_FIELD}
                        title={i18n.UNLINK_FIELD}
                        size="xs"
                        color="danger"
                        onClick={() => handleUnlink(fd)}
                        data-test-subj="fieldLibraryUnlinkButton"
                      />
                    </EuiFlexItem>,
                    'fieldLibraryLinkedRow'
                  )
                )}
                <EuiHorizontalRule margin="s" />
              </>
            )}

            <EuiFieldSearch
              placeholder="Search fields..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              compressed
              data-test-subj="fieldLibrarySearch"
            />
            <EuiSpacer size="s" />
            {filtered.map((fd) =>
              renderFieldRow(
                fd,
                <>
                  {hasReferenceMode && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="link"
                        aria-label={i18n.REFERENCE_FIELD}
                        title={i18n.REFERENCE_FIELD}
                        size="xs"
                        onClick={() => handleReference(fd)}
                        data-test-subj="fieldLibraryReferenceButton"
                      />
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType={hasReferenceMode ? 'copy' : 'plusInCircle'}
                      aria-label={hasReferenceMode ? i18n.COPY_FIELD : i18n.INSERT_FIELD}
                      title={hasReferenceMode ? i18n.COPY_FIELD : i18n.INSERT_FIELD}
                      size="xs"
                      onClick={() => handleInsert(fd)}
                      data-test-subj="fieldLibraryInsertButton"
                    />
                  </EuiFlexItem>
                </>
              )
            )}
          </>
        )}
      </div>
    </EuiAccordion>
  );
};

FieldLibraryPanel.displayName = 'FieldLibraryPanel';
