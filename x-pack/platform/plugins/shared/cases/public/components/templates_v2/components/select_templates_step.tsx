/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiBasicTableColumn, EuiTableSelectionType } from '@elastic/eui';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiBadge,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import * as i18n from '../../templates/translations';
import type { ParsedTemplateEntry, ParseYamlError } from '../hooks/use_parse_yaml';

const getItemId = (item: ParsedTemplateEntry) => `${item.sourceFileName}-${item.documentIndex}`;

export interface SelectTemplatesStepProps {
  templates: ParsedTemplateEntry[];
  errors: ParseYamlError[];
  onSelectionChange?: (selected: ParsedTemplateEntry[]) => void;
  onRowClick?: (template: ParsedTemplateEntry) => void;
}

export const SelectTemplatesStep: React.FC<SelectTemplatesStepProps> = ({
  templates,
  errors,
  onSelectionChange,
  onRowClick,
}) => {
  const newAccordionId = useGeneratedHtmlId({ prefix: 'newTemplates' });
  const overlappingAccordionId = useGeneratedHtmlId({ prefix: 'overlappingTemplates' });

  const [selectedNew, setSelectedNew] = useState<ParsedTemplateEntry[]>([]);
  const [selectedOverlapping, setSelectedOverlapping] = useState<ParsedTemplateEntry[]>([]);

  const handleNewSelectionChange = useCallback(
    (selected: ParsedTemplateEntry[]) => {
      setSelectedNew(selected);
      onSelectionChange?.([...selected, ...selectedOverlapping]);
    },
    [onSelectionChange, selectedOverlapping]
  );

  const handleOverlappingSelectionChange = useCallback(
    (selected: ParsedTemplateEntry[]) => {
      setSelectedOverlapping(selected);
      onSelectionChange?.([...selectedNew, ...selected]);
    },
    [onSelectionChange, selectedNew]
  );

  const newSelection = useMemo<EuiTableSelectionType<ParsedTemplateEntry>>(
    () => ({
      onSelectionChange: handleNewSelectionChange,
      initialSelected: selectedNew,
    }),
    [handleNewSelectionChange, selectedNew]
  );

  const overlappingSelection = useMemo<EuiTableSelectionType<ParsedTemplateEntry>>(
    () => ({
      onSelectionChange: handleOverlappingSelectionChange,
      initialSelected: selectedOverlapping,
    }),
    [handleOverlappingSelectionChange, selectedOverlapping]
  );

  const { newTemplates, overlappingTemplates } = useMemo(
    () => ({
      newTemplates: templates.filter((t) => !t.existsOnServer),
      overlappingTemplates: templates.filter((t) => t.existsOnServer),
    }),
    [templates]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<ParsedTemplateEntry>>>(
    () => [
      {
        field: 'name',
        name: i18n.COLUMN_NAME,
        width: '200px',
        render: (value: string, item: ParsedTemplateEntry) => {
          const truncated = value.length > 40 ? `${value.slice(0, 40)}…` : value;
          return (
            <EuiToolTip content={value}>
              <EuiLink
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onRowClick?.(item);
                }}
              >
                {truncated}
              </EuiLink>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'description',
        name: i18n.COLUMN_DESCRIPTION,
        width: '200px',
        render: (value: string | undefined) => {
          if (!value) return '-';
          const truncated = value.length > 50 ? `${value.slice(0, 50)}…` : value;
          return (
            <EuiToolTip content={value}>
              <span tabIndex={0}>{truncated}</span>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'category',
        name: i18n.COLUMN_CATEGORY,
        render: (value: string | null | undefined) => value ?? '-',
      },
      {
        field: 'tags',
        name: i18n.COLUMN_TAGS,
        render: (value: string[] | undefined) => {
          if (!value || value.length === 0) return '-';
          const visible = value.slice(0, 3);
          const remaining = value.length - 3;
          return (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
              {visible.map((tag) => (
                <EuiFlexItem grow={false} key={tag}>
                  <EuiBadge color="hollow">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
              {remaining > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={value.join(', ')}>
                    <EuiBadge tabIndex={0} color="hollow">
                      {`+${remaining}`}
                    </EuiBadge>
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'severity',
        name: i18n.COLUMN_SEVERITY,
        render: (value: string | undefined) => value ?? '-',
      },
      {
        name: i18n.COLUMN_FIELDS,
        render: (template: ParsedTemplateEntry) => {
          const fields = template.definition?.fields;
          const count = fields?.length ?? 0;
          if (!fields || count === 0) return 0;
          const tooltip = fields.map((f) => f.name).join(', ');
          return (
            <EuiToolTip content={tooltip}>
              <span tabIndex={0}>{count}</span>
            </EuiToolTip>
          );
        },
      },
    ],
    [onRowClick]
  );

  return (
    <>
      {errors.length > 0 && (
        <>
          <EuiCallOut
            announceOnMount
            title={i18n.PARSE_ERRORS_TITLE}
            color="danger"
            iconType="error"
            data-test-subj="template-flyout-parse-errors"
          >
            <ul>
              {errors.map((error) => (
                <li key={`${error.fileName}-${error.documentIndex}-${error.message}`}>
                  {error.message}
                </li>
              ))}
            </ul>
          </EuiCallOut>
          <EuiSpacer size="l" />
        </>
      )}
      {templates.length === 0 && errors.length === 0 && (
        <EuiEmptyPrompt
          iconType="document"
          title={<h3>{i18n.NO_TEMPLATES_FOUND}</h3>}
          body={<p>{i18n.NO_TEMPLATES_FOUND_BODY}</p>}
          data-test-subj="template-flyout-no-templates"
        />
      )}
      {newTemplates.length > 0 && (
        <EuiAccordion
          id={newAccordionId}
          buttonContent={<strong>{i18n.NEW_TEMPLATES_DETECTED(newTemplates.length)}</strong>}
          initialIsOpen
          data-test-subj="template-flyout-new-templates"
        >
          <EuiSpacer size="s" />
          <EuiBasicTable
            items={newTemplates}
            itemId={getItemId}
            columns={columns}
            selection={newSelection}
            tableCaption={i18n.NEW_TEMPLATES_DETECTED(newTemplates.length)}
            rowProps={(item) => ({
              'data-test-subj': `template-flyout-new-template-${item.name}`,
            })}
            tableLayout="auto"
          />
        </EuiAccordion>
      )}
      {newTemplates.length > 0 && overlappingTemplates.length > 0 && <EuiSpacer size="l" />}
      {overlappingTemplates.length > 0 && (
        <EuiAccordion
          id={overlappingAccordionId}
          buttonContent={
            <strong>{i18n.OVERLAPPING_TEMPLATES_DETECTED(overlappingTemplates.length)}</strong>
          }
          initialIsOpen
          data-test-subj="template-flyout-overlapping-templates"
        >
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {i18n.OVERLAPPING_TEMPLATES_NOTE}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiBasicTable
            items={overlappingTemplates}
            itemId={getItemId}
            columns={columns}
            selection={overlappingSelection}
            tableCaption={i18n.OVERLAPPING_TEMPLATES_DETECTED(overlappingTemplates.length)}
            rowProps={(item) => ({
              'data-test-subj': `template-flyout-overlapping-template-${item.name}`,
            })}
            tableLayout="auto"
          />
        </EuiAccordion>
      )}
    </>
  );
};

SelectTemplatesStep.displayName = 'SelectTemplatesStep';
