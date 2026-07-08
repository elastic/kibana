/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppHeader } from '@kbn/app-header';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual } from 'lodash';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { isMap, parse as parseYaml, parseDocument, type YAMLMap } from 'yaml';
import { useCasesLocalStorage } from '../../../common/use_cases_local_storage';
import type { YamlEditorFormValues } from './template_form';
import { useCasesTemplatesNavigation } from '../../../common/navigation';
import { useDebouncedYamlEdit } from '../hooks/use_debounced_yaml_edit';
import * as i18n from '../translations';
import { componentStyles } from './template_form_layout.styles';
import { TEMPLATE_PREVIEW_WIDTH_KEY } from '../constants';
import { TemplateResetModal } from './template_reset_modal';
import { getTemplateFormBadges, getTemplateFormMenu } from './header_menu';
import { TemplateEditorLayout } from './template_editor_layout';
import {
  type FieldDefaultValue,
  updateYamlFieldDefault,
  removeYamlFieldDefault,
} from '../utils/update_yaml_field_default';
import { validateTemplateDefinitionYaml } from '../utils/validate_template_definition';
import { computeChangedLines } from '../hooks/use_line_differences_decorations';
import {
  FieldType,
  UserPickerDefaultSchema,
} from '../../../../common/types/domain/template/fields';
import { normalizeYamlString } from '../utils/normalize_yaml_string';
import {
  getTemplateSettingsAndConnectorFromYaml,
  mergeTemplateDefinition,
} from '../utils/template_settings_yaml';
import { normalizeTemplateCaseDefaultsYaml } from '../utils/normalize_template_case_defaults';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { CaseAssignees } from '../../../../common/types/domain_zod/user/v1';
import {
  type TemplateSettings,
  TemplateSettingsSchema,
} from '../../../../common/types/domain/template/v1';
import {
  type TemplateMetadata,
  type TemplateMetadataErrors,
  normalizeTemplateMetadata,
  validateTemplateMetadata,
  hasTemplateMetadataErrors,
} from '../utils/template_metadata';
import {
  getTemplateMetadataFromYaml,
  setTemplateMetadataInYaml,
} from '../utils/template_metadata_yaml';

interface MetadataDraft extends TemplateMetadata {
  templateId?: string;
}

interface TemplateFormLayoutProps {
  form: UseFormReturn<YamlEditorFormValues>;
  title: string;
  initialMetadata: TemplateMetadata;
  isLoading?: boolean;
  isSaving?: boolean;
  onCreate: (
    data: YamlEditorFormValues,
    metadata: TemplateMetadata,
    isEnabled: boolean
  ) => Promise<void>;
  isEdit?: boolean;
  storageKey: string;
  initialValue: string;
  templateId?: string;
  initialIsEnabled?: boolean;
}

type EditableCaseDefaultField =
  | 'name'
  | 'description'
  | 'severity'
  | 'category'
  | 'tags'
  | 'assignees';
const ASSIGNEES_YAML_KEY = 'assignees';
const SETTINGS_YAML_KEY = 'settings';
const TIMELINE_BOTTOM_BAR_SELECTOR = '[data-test-subj="timeline-bottom-bar-container"]';
const LEGACY_SETTINGS_GUIDANCE_COMMENT =
  '# Case settings (sync alerts, extract observables) and the default connector are configured in the\n' +
  '# Settings tab of the preview panel, not here.';
const CURRENT_SETTINGS_GUIDANCE_COMMENT =
  '# Optional case settings and connector blocks can also be authored in this YAML.';

const getExplicitSettings = (settings?: TemplateSettings): TemplateSettings => ({
  syncAlerts: settings?.syncAlerts ?? false,
  extractObservables: settings?.extractObservables ?? false,
});

const ensureAssigneesVisibleInYaml = (definitionYaml: string): string => {
  try {
    const doc = parseDocument(definitionYaml ?? '');
    if (!isMap(doc.contents)) {
      return definitionYaml;
    }

    const root = doc.contents as YAMLMap<unknown, unknown>;
    if (!root.has(ASSIGNEES_YAML_KEY)) {
      root.set(ASSIGNEES_YAML_KEY, doc.createNode([]));
      return doc.toString();
    }

    return definitionYaml;
  } catch {
    return definitionYaml;
  }
};

const ensureSettingsVisibleInYaml = (definitionYaml: string): string => {
  try {
    const parsedDefinition = parseYaml(definitionYaml ?? '');
    const parsedRecord =
      parsedDefinition != null &&
      typeof parsedDefinition === 'object' &&
      !Array.isArray(parsedDefinition)
        ? (parsedDefinition as Record<string, unknown>)
        : undefined;
    const parsedSettings = TemplateSettingsSchema.safeParse(parsedRecord?.[SETTINGS_YAML_KEY]);
    const existingSettings = parsedSettings.success ? parsedSettings.data : undefined;

    if (
      existingSettings?.syncAlerts !== undefined &&
      existingSettings.extractObservables !== undefined
    ) {
      return definitionYaml;
    }

    const doc = parseDocument(definitionYaml ?? '');
    if (!isMap(doc.contents)) {
      return definitionYaml;
    }

    const root = doc.contents as YAMLMap<unknown, unknown>;

    root.set(SETTINGS_YAML_KEY, doc.createNode(getExplicitSettings(existingSettings)));
    return doc.toString();
  } catch {
    return definitionYaml;
  }
};

const normalizeLegacyTemplateYamlComments = (definitionYaml: string): string =>
  (definitionYaml ?? '').replace(
    LEGACY_SETTINGS_GUIDANCE_COMMENT,
    CURRENT_SETTINGS_GUIDANCE_COMMENT
  );

const normalizeSettingsGuidanceCommentPlacement = (definitionYaml: string): string => {
  const lines = (definitionYaml ?? '').split('\n');
  const withoutComment = lines.filter((line) => line !== CURRENT_SETTINGS_GUIDANCE_COMMENT);
  const settingsIndex = withoutComment.findIndex((line) =>
    line.trimStart().startsWith('settings:')
  );

  if (settingsIndex === -1) {
    return withoutComment.join('\n');
  }

  withoutComment.splice(settingsIndex, 0, CURRENT_SETTINGS_GUIDANCE_COMMENT);
  return withoutComment.join('\n');
};

const normalizeTemplateDefinitionYaml = (definitionYaml: string): string => {
  const normalizedComments = normalizeLegacyTemplateYamlComments(definitionYaml);
  const withAssignees = ensureAssigneesVisibleInYaml(normalizedComments);
  const withSettings = ensureSettingsVisibleInYaml(withAssignees);
  return normalizeSettingsGuidanceCommentPlacement(withSettings);
};

const updateYamlCaseDefault = (
  definitionYaml: string,
  field: EditableCaseDefaultField,
  value: string | string[] | CaseAssignees
) => {
  try {
    const doc = parseDocument(definitionYaml ?? '');
    if (!isMap(doc.contents)) {
      return definitionYaml;
    }

    const root = doc.contents as YAMLMap<unknown, unknown>;

    if (field === 'assignees') {
      root.set('assignees', doc.createNode(value as CaseAssignees));
      return doc.toString();
    }

    if (field === 'tags') {
      root.set('tags', doc.createNode(value as string[]));
      return doc.toString();
    }

    const stringValue = value as string;

    if ((field === 'severity' || field === 'category') && stringValue.length === 0) {
      root.delete(field);
      return doc.toString();
    }

    root.set(field, stringValue);
    return doc.toString();
  } catch {
    return definitionYaml;
  }
};

export const TemplateFormLayout: React.FC<TemplateFormLayoutProps> = ({
  form,
  title,
  initialMetadata,
  isLoading,
  isSaving,
  onCreate,
  isEdit = false,
  storageKey,
  initialValue,
  templateId,
  initialIsEnabled = true,
}) => {
  const styles = useMemoCss(componentStyles);
  const { getCasesTemplatesUrl, navigateToCasesTemplates } = useCasesTemplatesNavigation();
  useEffect(() => {
    let timelineBottomBar: HTMLElement | null = null;
    let previousDisplayValue: string | null = null;
    const timeoutId = window.setTimeout(() => {
      timelineBottomBar = document.querySelector<HTMLElement>(TIMELINE_BOTTOM_BAR_SELECTOR);
      if (!timelineBottomBar) {
        return;
      }

      previousDisplayValue = timelineBottomBar.style.display;
      timelineBottomBar.style.display = 'none';
    });

    return () => {
      window.clearTimeout(timeoutId);
      if (!timelineBottomBar || previousDisplayValue == null) {
        return;
      }

      if (previousDisplayValue.length > 0) {
        timelineBottomBar.style.display = previousDisplayValue;
      } else {
        timelineBottomBar.style.removeProperty('display');
      }
    };
  }, []);

  const defaultPreviewWidth = Math.floor(window.innerWidth * 0.3);
  const [previewWidth = defaultPreviewWidth, setPreviewWidth] = useLocalStorage(
    TEMPLATE_PREVIEW_WIDTH_KEY,
    defaultPreviewWidth
  );

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [isEnabled, setIsEnabled] = useState(initialIsEnabled);
  // Bumped whenever the YAML draft is reset. The connector picker reads default values at mount,
  // so remounting guarantees it re-seeds from the restored YAML connector block.
  const [formResetKey, setFormResetKey] = useState(0);

  const initialDefinitionYaml = useMemo(
    () => normalizeTemplateDefinitionYaml(setTemplateMetadataInYaml(initialValue, initialMetadata)),
    [initialValue, initialMetadata]
  );
  const initialMetadataFromYaml = useMemo(
    () => getTemplateMetadataFromYaml(initialDefinitionYaml, initialMetadata),
    [initialDefinitionYaml, initialMetadata]
  );
  // Template metadata is edited in the render panel and mirrored into YAML (`template_name`,
  // `template_description`, `template_tags`). Keep the same draft semantics so refresh never drops
  // unsaved template identity changes.
  const initialMetadataState = useMemo<MetadataDraft>(
    () => ({ ...initialMetadataFromYaml, templateId }),
    [initialMetadataFromYaml, templateId]
  );
  const [storedMetadataState, setStoredMetadataState] = useCasesLocalStorage<MetadataDraft>(
    `${storageKey}.metadata`,
    initialMetadataState
  );
  const useStoredMetadataState =
    storedMetadataState != null && storedMetadataState.templateId === templateId;
  const metadata = useMemo<TemplateMetadata>(
    () =>
      useStoredMetadataState
        ? {
            name: storedMetadataState.name ?? '',
            description: storedMetadataState.description ?? '',
            tags: storedMetadataState.tags ?? [],
          }
        : initialMetadataFromYaml,
    [useStoredMetadataState, storedMetadataState, initialMetadataFromYaml]
  );
  const metadataErrors = useMemo<TemplateMetadataErrors>(
    () => validateTemplateMetadata(metadata),
    [metadata]
  );

  const metadataRef = useRef(metadata);
  metadataRef.current = metadata;

  const {
    value: yamlValue,
    onChange: onYamlChange,
    handleReset,
    clearDraft,
    isSaving: isYamlSaving,
    isSaved: isYamlSaved,
  } = useDebouncedYamlEdit(
    storageKey,
    initialDefinitionYaml,
    (newValue) => form.setValue('definition', newValue),
    templateId
  );
  const normalizedYamlValue = useMemo(
    () => normalizeTemplateDefinitionYaml(yamlValue ?? ''),
    [yamlValue]
  );
  const definitionState = useMemo(
    () => getTemplateSettingsAndConnectorFromYaml(normalizedYamlValue),
    [normalizedYamlValue]
  );
  const settings = definitionState.settings;
  const connector = definitionState.connector;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const connectorRef = useRef(connector);
  connectorRef.current = connector;

  const hasChanges = useMemo(() => {
    const yamlChanged =
      computeChangedLines(
        normalizeYamlString(initialDefinitionYaml),
        normalizeYamlString(normalizedYamlValue)
      ).length > 0;
    const metadataChanged = !isEqual(
      normalizeTemplateMetadata(metadata),
      normalizeTemplateMetadata(initialMetadataFromYaml)
    );
    return yamlChanged || metadataChanged;
  }, [initialDefinitionYaml, normalizedYamlValue, metadata, initialMetadataFromYaml]);

  const hasValidationErrors = useMemo(
    () =>
      !validateTemplateDefinitionYaml(normalizedYamlValue).success ||
      hasTemplateMetadataErrors(metadataErrors),
    [normalizedYamlValue, metadataErrors]
  );

  const yamlValueRef = useRef(normalizedYamlValue);
  yamlValueRef.current = normalizedYamlValue;

  const syncMetadataFromYaml = useCallback(
    (nextYaml: string) => {
      const nextMetadata = getTemplateMetadataFromYaml(nextYaml, metadataRef.current);
      if (!isEqual(nextMetadata, metadataRef.current)) {
        setStoredMetadataState({ ...nextMetadata, templateId });
      }
    },
    [setStoredMetadataState, templateId]
  );

  const handleYamlChange = useCallback(
    (nextYaml: string) => {
      const normalizedNextYaml = normalizeTemplateDefinitionYaml(nextYaml);
      onYamlChange(normalizedNextYaml);
      syncMetadataFromYaml(normalizedNextYaml);
    },
    [onYamlChange, syncMetadataFromYaml]
  );

  const handleSettingsChange = useCallback(
    (next: TemplateSettings) => {
      const updatedYaml = mergeTemplateDefinition(yamlValueRef.current, {
        settings: getExplicitSettings(next),
        connector: connectorRef.current,
      });
      if (updatedYaml !== yamlValueRef.current) {
        handleYamlChange(updatedYaml);
      }
    },
    [handleYamlChange]
  );

  const handleConnectorChange = useCallback(
    (next: CaseConnectorWithoutName) => {
      const updatedYaml = mergeTemplateDefinition(yamlValueRef.current, {
        settings: settingsRef.current,
        connector: next,
      });
      if (updatedYaml !== yamlValueRef.current) {
        handleYamlChange(updatedYaml);
      }
    },
    [handleYamlChange]
  );

  const handleMetadataChange = useCallback(
    (next: TemplateMetadata) => {
      setStoredMetadataState({ ...next, templateId });

      const updatedYaml = normalizeTemplateDefinitionYaml(
        setTemplateMetadataInYaml(yamlValueRef.current, next)
      );
      if (updatedYaml !== yamlValueRef.current) {
        onYamlChange(updatedYaml);
      }
    },
    [setStoredMetadataState, templateId, onYamlChange]
  );

  const handleFieldDefaultChange = useCallback(
    (fieldName: string, value: string, control: string) => {
      const isEmptyNumeric = control === FieldType.INPUT_NUMBER && value.trim() === '';
      const isEmptyUserPicker =
        control === FieldType.USER_PICKER && (value === '' || value === '[]');

      if (isEmptyNumeric || isEmptyUserPicker) {
        const updatedYaml = removeYamlFieldDefault(yamlValueRef.current, fieldName);
        if (updatedYaml !== yamlValueRef.current) {
          handleYamlChange(updatedYaml);
        }
        return;
      }

      let parsedValue: FieldDefaultValue;
      if (control === FieldType.INPUT_NUMBER) {
        parsedValue = Number(value.trim());
      } else if (control === FieldType.CHECKBOX_GROUP) {
        try {
          parsedValue = JSON.parse(value) as string[];
        } catch {
          parsedValue = [];
        }
      } else if (control === FieldType.USER_PICKER) {
        try {
          const result = UserPickerDefaultSchema.safeParse(JSON.parse(value));
          parsedValue = result.success ? result.data : [];
        } catch {
          parsedValue = [];
        }
      } else {
        parsedValue = value;
      }
      const updatedYaml = updateYamlFieldDefault(yamlValueRef.current, fieldName, parsedValue);
      if (updatedYaml !== yamlValueRef.current) {
        handleYamlChange(updatedYaml);
      }
    },
    [handleYamlChange]
  );

  const handleCaseDefaultChange = useCallback(
    (field: EditableCaseDefaultField, value: string | string[] | CaseAssignees) => {
      const updatedYaml = updateYamlCaseDefault(yamlValueRef.current, field, value);
      if (updatedYaml !== yamlValueRef.current) {
        handleYamlChange(updatedYaml);
      }
    },
    [handleYamlChange]
  );

  const handleResetClick = useCallback(() => {
    setIsResetModalVisible(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    handleReset();
    setStoredMetadataState(initialMetadataState);
    // Remount the connector picker so it re-seeds from the restored YAML connector block.
    setFormResetKey((count) => count + 1);
    setIsResetModalVisible(false);
  }, [handleReset, setStoredMetadataState, initialMetadataState]);

  const handleResetCancel = useCallback(() => {
    setIsResetModalVisible(false);
  }, []);

  const handleSave = useCallback(() => {
    setSubmitError(null);

    // Canonicalize legacy top-level defaults (for example `title`) into the current top-level shape
    // so users can edit naturally while persisted templates stay in one stable shape.
    const normalizedMetadataFromYaml = normalizeTemplateMetadata(
      getTemplateMetadataFromYaml(normalizedYamlValue, metadata)
    );
    const mergedDefinition = normalizeTemplateCaseDefaultsYaml(
      setTemplateMetadataInYaml(normalizedYamlValue, normalizedMetadataFromYaml)
    );

    const validationResult = validateTemplateDefinitionYaml(mergedDefinition);
    if (!validationResult.success || hasTemplateMetadataErrors(metadataErrors)) {
      setSubmitError(i18n.FIX_VALIDATION_ERRORS);
      return;
    }
    const normalizedMetadata = normalizedMetadataFromYaml;

    form.handleSubmit(
      async (data) => {
        try {
          await onCreate({ ...data, definition: mergedDefinition }, normalizedMetadata, isEnabled);
          clearDraft(isEdit ? mergedDefinition : undefined);
          setStoredMetadataState(
            isEdit ? { ...normalizedMetadata, templateId } : initialMetadataState
          );
        } catch (e) {
          setSubmitError(e?.message ?? i18n.FAILED_TO_SAVE_TEMPLATE);
        }
      },
      () => {
        setSubmitError(i18n.FIX_VALIDATION_ERRORS);
      }
    )();
  }, [
    form,
    onCreate,
    isEnabled,
    isEdit,
    clearDraft,
    normalizedYamlValue,
    metadata,
    metadataErrors,
    setStoredMetadataState,
    templateId,
    initialMetadataState,
  ]);

  const handleIsEnabledChange = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
  }, []);

  const templateFormMenu = useMemo(
    () =>
      getTemplateFormMenu({
        hasChanges,
        hasValidationErrors,
        isEdit,
        isLoading,
        isSaving,
        isEnabled,
        submitError,
        onReset: handleResetClick,
        onSave: handleSave,
        onIsEnabledChange: handleIsEnabledChange,
      }),
    [
      handleIsEnabledChange,
      handleResetClick,
      handleSave,
      hasChanges,
      hasValidationErrors,
      isEdit,
      isEnabled,
      isLoading,
      isSaving,
      submitError,
    ]
  );

  const templateFormBadges = useMemo(() => getTemplateFormBadges(hasChanges), [hasChanges]);

  const templateFormBack = useMemo(
    () => ({
      href: getCasesTemplatesUrl(),
      // `AppHeader` renders this as "Back to {label}", so pass just the destination name.
      label: i18n.TEMPLATE_TITLE,
      // AppHeader's back button keeps its `href` on the rendered anchor, so the default
      // navigation must be prevented here to avoid a full page reload alongside the SPA one.
      onClick: (event: React.MouseEvent) => {
        event.preventDefault();
        navigateToCasesTemplates();
      },
    }),
    [getCasesTemplatesUrl, navigateToCasesTemplates]
  );

  return (
    <FormProvider {...form}>
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        // The templates editor hides the Security Solution timeline bottom bar on this page,
        // so no bottom offset is needed here.
        css={[kbnFullBodyHeightCss('0px'), styles.wrapper]}
      >
        <EuiFlexItem grow={false}>
          <AppHeader
            title={title}
            back={templateFormBack}
            badges={templateFormBadges}
            menu={templateFormMenu}
            sticky={false}
            // Breaks the header out to the surrounding EuiPageSection's edges (top/left/right)
            // and re-insets its content by the same amount, so it runs edge-to-edge while the
            // title/menu stay aligned with the page gutter.
            padding={{ bleed: 'l' }}
          />
        </EuiFlexItem>

        <EuiFlexItem css={styles.editorWrapper}>
          <TemplateEditorLayout
            isLoading={isLoading}
            yamlValue={normalizedYamlValue}
            onYamlChange={handleYamlChange}
            onFieldDefaultChange={handleFieldDefaultChange}
            onCaseDefaultChange={handleCaseDefaultChange}
            isYamlSaving={isYamlSaving}
            isYamlSaved={isYamlSaved}
            previewWidth={previewWidth}
            onPreviewWidthChange={setPreviewWidth}
            savedValue={isEdit ? initialDefinitionYaml : undefined}
            settings={settings}
            connector={connector}
            onSettingsChange={handleSettingsChange}
            onConnectorChange={handleConnectorChange}
            metadata={metadata}
            metadataErrors={metadataErrors}
            onMetadataChange={handleMetadataChange}
            formResetKey={formResetKey}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isResetModalVisible && (
        <TemplateResetModal onCancel={handleResetCancel} onConfirm={handleResetConfirm} />
      )}
    </FormProvider>
  );
};

TemplateFormLayout.displayName = 'TemplateFormLayout';
