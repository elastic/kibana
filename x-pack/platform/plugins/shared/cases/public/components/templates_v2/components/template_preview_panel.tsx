/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiPortal,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from '../translations';
import type { ParsedTemplateEntry } from '../hooks/use_parse_yaml';
import { TemplateFieldRenderer } from '../field_types/field_renderer';

export interface TemplatePreviewPanelProps {
  template: ParsedTemplateEntry;
  onClose: () => void;
  flyoutRef: React.RefObject<HTMLDivElement | null>;
}

export const TemplatePreviewPanel: React.FC<TemplatePreviewPanelProps> = ({
  template,
  onClose,
  flyoutRef,
}) => {
  const { euiTheme } = useEuiTheme();
  const [flyoutRect, setFlyoutRect] = useState<{
    top: number;
    right: number;
    height: number;
  } | null>(null);

  const measureFlyout = useCallback(() => {
    const flyoutEl = flyoutRef.current;
    if (flyoutEl) {
      const rect = flyoutEl.getBoundingClientRect();
      setFlyoutRect({ top: rect.top, right: window.innerWidth - rect.left, height: rect.height });
    }
  }, [flyoutRef]);

  useEffect(() => {
    measureFlyout();
    window.addEventListener('resize', measureFlyout);
    return () => window.removeEventListener('resize', measureFlyout);
  }, [measureFlyout]);

  const metadataItems = useMemo(() => {
    const items: Array<{ title: string; description: string }> = [];
    if (template.description) {
      items.push({ title: i18n.COLUMN_DESCRIPTION, description: template.description });
    }
    if (template.severity) {
      items.push({ title: i18n.COLUMN_SEVERITY, description: template.severity });
    }
    if (template.category) {
      items.push({ title: i18n.COLUMN_CATEGORY, description: template.category });
    }
    if (template.owner) {
      items.push({ title: i18n.COLUMN_AUTHOR, description: template.owner });
    }
    return items;
  }, [template]);

  const parsedDefinition = useMemo(() => {
    if (!template.definition?.fields?.length) {
      return null;
    }
    return {
      // Case-default title, falling back to the template name for this preview object (the field
      // renderer below only reads `fields`, but `name` is a required case default).
      name: template.caseDefaults?.title ?? template.name,
      description: template.caseDefaults?.description,
      tags: template.caseDefaults?.tags,
      severity: template.caseDefaults?.severity,
      // caseDefaults.category may be null on the summary type; the definition no longer allows null,
      // so coerce an absent category to undefined ("no default").
      category: template.caseDefaults?.category ?? undefined,
      assignees: template.caseDefaults?.assignees,
      fields: template.definition.fields,
    };
  }, [template]);

  if (!flyoutRect) {
    return null;
  }

  return (
    <EuiPortal>
      <EuiPanel
        css={css`
          position: fixed;
          top: ${flyoutRect.top}px;
          right: ${flyoutRect.right}px;
          height: ${flyoutRect.height}px;
          width: 20vw;
          z-index: ${euiTheme.levels.flyout};
          border-radius: 0;
          overflow: auto;
          box-shadow: none;
          border-right: 1px solid ${euiTheme.colors.lightShade};
        `}
        paddingSize="m"
        hasBorder={false}
        data-test-subj="template-preview-panel"
      >
        <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.CLOSE_PREVIEW} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                aria-label={i18n.CLOSE_PREVIEW}
                onClick={onClose}
                data-test-subj="template-preview-close"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiTitle size="s">
          <h3>{template.name}</h3>
        </EuiTitle>

        {template.tags && template.tags.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h4>{i18n.COLUMN_TAGS}</h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {template.tags.map((tag) => (
                <EuiFlexItem grow={false} key={tag}>
                  <EuiBadge color="hollow">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}

        {metadataItems.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiDescriptionList listItems={metadataItems} compressed />
          </>
        )}

        {parsedDefinition && (
          <>
            <EuiHorizontalRule margin="m" />
            <EuiTitle size="xxs">
              <h4>{i18n.COLUMN_FIELDS}</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <TemplateFieldRenderer parsedTemplate={parsedDefinition} owner={template.owner} />
          </>
        )}
      </EuiPanel>
    </EuiPortal>
  );
};

TemplatePreviewPanel.displayName = 'TemplatePreviewPanel';
