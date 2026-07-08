/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
  ResizableLayoutOrder,
} from '@kbn/resizable-layout';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { CaseAssignees } from '../../../../common/types/domain_zod/user/v1';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
import type { TemplateMetadata, TemplateMetadataErrors } from '../utils/template_metadata';
import { TemplateYamlEditor } from './template_form';
import { TemplateRenderPanel } from './template_render_panel';
import { componentStyles } from './template_form_layout.styles';
import { MIN_EDITOR_WIDTH, MIN_PREVIEW_WIDTH } from '../constants';

interface TemplateEditorLayoutProps {
  isLoading?: boolean;
  yamlValue: string;
  onYamlChange: (value: string) => void;
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
  onCaseDefaultChange?: (
    field: 'name' | 'description' | 'severity' | 'category' | 'tags' | 'assignees',
    value: string | string[] | CaseAssignees
  ) => void;
  isYamlSaving: boolean;
  isYamlSaved: boolean;
  previewWidth: number;
  onPreviewWidthChange: (width: number) => void;
  savedValue?: string;
  settings?: TemplateSettings;
  connector?: CaseConnectorWithoutName;
  onSettingsChange: (settings: TemplateSettings) => void;
  onConnectorChange: (connector: CaseConnectorWithoutName) => void;
  metadata: TemplateMetadata;
  metadataErrors: TemplateMetadataErrors;
  onMetadataChange: (metadata: TemplateMetadata) => void;
  formResetKey?: number;
  isYamlDefinitionValid: boolean;
}

export const TemplateEditorLayout: React.FC<TemplateEditorLayoutProps> = ({
  isLoading,
  yamlValue,
  onYamlChange,
  onFieldDefaultChange,
  onCaseDefaultChange,
  isYamlSaving,
  isYamlSaved,
  previewWidth,
  onPreviewWidthChange,
  savedValue,
  settings,
  connector,
  onSettingsChange,
  onConnectorChange,
  metadata,
  metadataErrors,
  onMetadataChange,
  formResetKey,
  isYamlDefinitionValid,
}) => {
  const styles = useMemoCss(componentStyles);

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" css={css({ height: '100%' })}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexGroup>
    );
  }

  return (
    <ResizableLayout
      className="eui-fullHeight"
      flexPanel={
        <div css={styles.editorPanel}>
          <TemplateYamlEditor
            value={yamlValue}
            onChange={onYamlChange}
            isSaving={isYamlSaving}
            isSaved={isYamlSaved}
            savedValue={savedValue}
          />
        </div>
      }
      minFlexPanelSize={MIN_EDITOR_WIDTH}
      fixedPanel={
        <div css={styles.previewPanel} data-test-subj="templatePreviewPanel">
          <TemplateRenderPanel
            settings={settings}
            connector={connector}
            onSettingsChange={onSettingsChange}
            onConnectorChange={onConnectorChange}
            metadata={metadata}
            metadataErrors={metadataErrors}
            onMetadataChange={onMetadataChange}
            onFieldDefaultChange={onFieldDefaultChange}
            onCaseDefaultChange={onCaseDefaultChange}
            formResetKey={formResetKey}
            isYamlDefinitionValid={isYamlDefinitionValid}
          />
        </div>
      }
      fixedPanelSize={previewWidth}
      onFixedPanelSizeChange={onPreviewWidthChange}
      minFixedPanelSize={MIN_PREVIEW_WIDTH}
      fixedPanelOrder={ResizableLayoutOrder.End}
      mode={ResizableLayoutMode.Resizable}
      direction={ResizableLayoutDirection.Horizontal}
      resizeButtonClassName="templatePreviewResizeButton"
      data-test-subj="templateEditorWithPreviewLayout"
    />
  );
};

TemplateEditorLayout.displayName = 'TemplateEditorLayout';
