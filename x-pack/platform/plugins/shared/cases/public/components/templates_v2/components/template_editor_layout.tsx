/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiTab,
  EuiTabs,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
  ResizableLayoutOrder,
} from '@kbn/resizable-layout';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
import type { TemplateMetadata, TemplateMetadataErrors } from '../utils/template_metadata';
import type { OnCaseDefaultChange } from '../case_default_fields';
import { TemplateYamlEditor } from './template_form';
import { TemplatePreview } from './template_preview';
import { TemplateConfigurationTab } from './template_configuration_tab';
import { componentStyles } from './template_form_layout.styles';
import { MIN_EDITOR_WIDTH, MIN_PREVIEW_WIDTH } from '../constants';
import * as i18n from '../translations';

interface TemplateEditorLayoutProps {
  isLoading?: boolean;
  yamlValue: string;
  onYamlChange: (value: string) => void;
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
  onCaseDefaultChange?: OnCaseDefaultChange;
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
  /** The Fields YAML has validation errors — surfaces an indicator on the Fields tab. */
  fieldsHaveErrors?: boolean;
}

type ActiveTab = 'fields' | 'configuration';

/**
 * The template editor: full-area `Fields` and `Configuration` tabs. The YAML editor is only rendered
 * on the Fields tab (alongside its live two-way preview), so it is never shown beside content it is
 * not bound to. Configuration (identity + settings + connector) is panel-owned. A required-name
 * indicator on the Configuration tab surfaces when the template name is missing/invalid, so
 * defaulting to the Fields tab never hides that required step.
 *
 * The preview is always mounted; it renders its own empty/invalid states from the definition
 * internally. It must NOT be unmounted while the YAML is invalid — remounting on recovery would
 * reset its watch subscription and leave it stale until a tab switch.
 */
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
  fieldsHaveErrors = false,
}) => {
  const styles = useMemoCss(componentStyles);
  const [activeTab, setActiveTab] = useState<ActiveTab>('fields');
  // A tab body is mounted on its FIRST activation and then kept mounted (toggled with `hidden`).
  // Mounting on first visit — rather than eagerly — means each body mounts while VISIBLE: Monaco
  // editors (the Fields YAML editor and the connector's additional-fields JSON editor) don't
  // initialize their content inside a `display:none` container. Keeping it mounted afterwards
  // avoids remounting/re-fetching the connector picker on every subsequent tab switch.
  const [mountedTabs, setMountedTabs] = useState<ReadonlySet<ActiveTab>>(() => new Set(['fields']));

  const selectTab = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setMountedTabs((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
  }, []);

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" css={css({ height: '100%' })}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexGroup>
    );
  }

  const nameNeedsAttention = metadataErrors.name != null;

  const tabs = (
    <EuiTabs
      css={css`
        padding-inline: 16px;
      `}
    >
      <EuiTab
        isSelected={activeTab === 'fields'}
        onClick={() => selectTab('fields')}
        append={
          fieldsHaveErrors ? (
            <EuiToolTip content={i18n.FIELDS_TAB_HAS_ERRORS}>
              <EuiNotificationBadge
                color="accent"
                aria-label={i18n.FIELDS_TAB_HAS_ERRORS}
                data-test-subj="templateFieldsTabErrorIndicator"
              >
                {'!'}
              </EuiNotificationBadge>
            </EuiToolTip>
          ) : undefined
        }
        data-test-subj="templateTabFields"
      >
        {i18n.FIELDS_TAB_LABEL}
      </EuiTab>
      <EuiTab
        isSelected={activeTab === 'configuration'}
        onClick={() => selectTab('configuration')}
        append={
          nameNeedsAttention ? (
            <EuiToolTip content={i18n.CONFIGURATION_TAB_NAME_REQUIRED}>
              <EuiNotificationBadge
                color="accent"
                aria-label={i18n.CONFIGURATION_TAB_NAME_REQUIRED}
                data-test-subj="templateConfigTabRequiredIndicator"
              >
                {'!'}
              </EuiNotificationBadge>
            </EuiToolTip>
          ) : undefined
        }
        data-test-subj="templateTabConfiguration"
      >
        {i18n.CONFIGURATION_TAB_LABEL}
      </EuiTab>
    </EuiTabs>
  );

  const fieldsPreview = (
    <div css={styles.previewPanel} data-test-subj="templatePreviewPanel">
      <TemplatePreview
        settings={settings}
        connector={connector}
        onFieldDefaultChange={onFieldDefaultChange}
        onCaseDefaultChange={onCaseDefaultChange}
      />
    </div>
  );

  const fieldsTab = (
    <ResizableLayout
      className="eui-fullHeight"
      flexPanel={
        <div css={styles.editorPanel} data-test-subj="templateYamlEditorPanel">
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
      fixedPanel={fieldsPreview}
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

  // Each tab body mounts on its first activation and is then toggled with the `hidden` attribute
  // (see mountedTabs). Swapping them with a plain ternary remounted the Configuration tab on every
  // switch — re-running the connector picker's async fetch and resetting its state — while eagerly
  // mounting both would initialize the Configuration tab's Monaco editors inside a hidden container.
  return (
    <EuiFlexGroup direction="column" gutterSize="none" css={css({ height: '100%', minHeight: 0 })}>
      <div>{tabs}</div>
      <div css={css({ flexGrow: 1, minHeight: 0 })}>
        <div
          role="tabpanel"
          hidden={activeTab !== 'fields'}
          css={css({ height: '100%', minHeight: 0 })}
          data-test-subj="templateFieldsTabBody"
        >
          {mountedTabs.has('fields') ? fieldsTab : null}
        </div>
        <div
          role="tabpanel"
          hidden={activeTab !== 'configuration'}
          css={css({ height: '100%', minHeight: 0 })}
          data-test-subj="templateConfigurationTabBody"
        >
          {mountedTabs.has('configuration') ? (
            <TemplateConfigurationTab
              metadata={metadata}
              metadataErrors={metadataErrors}
              onMetadataChange={onMetadataChange}
              settings={settings}
              connector={connector}
              onSettingsChange={onSettingsChange}
              onConnectorChange={onConnectorChange}
              formResetKey={formResetKey}
            />
          ) : null}
        </div>
      </div>
    </EuiFlexGroup>
  );
};

TemplateEditorLayout.displayName = 'TemplateEditorLayout';
