/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual } from 'lodash';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { isMap, parseDocument } from 'yaml';
import { useCasesLocalStorage } from '../../../common/use_cases_local_storage';
import type { YamlEditorFormValues } from './template_form';
import { useCasesTemplatesNavigation } from '../../../common/navigation';
import { CasesAppHeader } from '../../app/cases_app_header';
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
import {
  FieldType,
  UserPickerDefaultSchema,
} from '../../../../common/types/domain/template/fields';
import { SECURITY_SOLUTION_OWNER } from '../../../../common/constants';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { normalizeYamlString } from '../utils/normalize_yaml_string';
import {
  getTemplateSettingsAndConnectorFromYaml,
  getExplicitTemplateSettings,
  mergeTemplateDefinition,
  stripTemplateConfigBlocks,
  normalizeTemplateConnector,
  normalizeTemplateSettings,
} from '../utils/template_settings_yaml';
import { normalizeTemplateCaseDefaultsYaml } from '../utils/normalize_template_case_defaults';
import { seedRequiredTemplateBlocks } from '../utils/seed_template_definition';
import { reorderTemplateDefinitionKeys } from '../utils/reorder_template_definition_keys';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { CaseAssignees } from '../../../../common/types/domain_zod/user/v1';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
import {
  type TemplateMetadata,
  type TemplateMetadataErrors,
  normalizeTemplateMetadata,
  validateTemplateMetadata,
  hasTemplateMetadataErrors,
} from '../utils/template_metadata';
import type { EditableCaseDefaultField, EditableCaseDefaultValue } from '../case_default_fields';

interface MetadataDraft extends TemplateMetadata {
  templateId?: string;
}

/**
 * Panel-owned case settings + default connector, drafted in local storage (keyed by templateId) like
 * the metadata draft. These are NOT part of the editor buffer under the Fields/Configuration split;
 * they are lifted out of the loaded definition and merged back in on save.
 */
interface TemplateConfigDraft {
  templateId?: string;
  settings?: TemplateSettings;
  connector?: CaseConnectorWithoutName;
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
  /**
   * Default case settings for a NEW template whose definition carries no `settings` block (i.e.
   * create). Ignored once the definition has its own settings (edit / imported). Lets the create
   * page apply solution-aware defaults (e.g. sync alerts on only for Security).
   */
  initialSettings?: TemplateSettings;
}

// The template editor is always rendered `fullHeight` (see CasesPageLayout). On Security Solution a
// fixed "timeline" bottom bar overlays the bottom of every page (~57px), so the editor reserves that
// space to avoid being hidden behind it. No other solution (Observability, Stack) renders that bar,
// so reserving the space elsewhere would only leave dead space at the bottom — the offset is applied
// for the Security Solution owner only. (Cases can't read the bar's height generically: it is
// Security-owned and exposes no shared signal, so this is keyed on owner rather than the DOM.)
const SECURITY_TIMELINE_BOTTOM_BAR_OFFSET = '57px';
const NO_BODY_OFFSET = '0px';

/**
 * The full-height body offset for the template editor: the Security Solution timeline bottom-bar
 * reservation for the Security owner, otherwise none. Exported for testing.
 */
export const getTemplateEditorBodyOffset = (owner: string[]): string =>
  owner.includes(SECURITY_SOLUTION_OWNER) ? SECURITY_TIMELINE_BOTTOM_BAR_OFFSET : NO_BODY_OFFSET;
const LEGACY_SETTINGS_GUIDANCE_COMMENT =
  '# Case settings (sync alerts, extract observables) and the default connector are configured in the\n' +
  '# Settings tab of the preview panel, not here.';
const CURRENT_SETTINGS_GUIDANCE_COMMENT =
  '# Case settings and the default connector are always represented below and can be edited here.';

const normalizeLegacyTemplateYamlComments = (definitionYaml: string): string =>
  (definitionYaml ?? '').replace(
    LEGACY_SETTINGS_GUIDANCE_COMMENT,
    CURRENT_SETTINGS_GUIDANCE_COMMENT
  );

/**
 * Per-change YAML normalization: cosmetic comment cleanup only. Required blocks are seeded once when
 * the editor initializes (see seedRequiredTemplateBlocks); they are intentionally NOT re-injected
 * here, so removing a required block surfaces as a validation error rather than being silently
 * re-added.
 */
const normalizeTemplateDefinitionYaml = (definitionYaml: string): string =>
  normalizeLegacyTemplateYamlComments(definitionYaml);

const updateYamlCaseDefault = (
  definitionYaml: string,
  field: EditableCaseDefaultField,
  value: EditableCaseDefaultValue
) => {
  try {
    const doc = parseDocument(definitionYaml ?? '');
    // A non-null, non-map buffer (malformed / scalar YAML) is left untouched so a case-default edit
    // never clobbers content the author is mid-editing. An empty or comment-only buffer parses to
    // `null` contents; the document-level `set`/`delete` below initialize it into a map, so an edit
    // made after the author cleared every case default is written back instead of silently dropped.
    if (doc.contents != null && !isMap(doc.contents)) {
      return definitionYaml;
    }

    if (field === 'assignees') {
      doc.set('assignees', doc.createNode(value as CaseAssignees));
    } else if (field === 'tags') {
      doc.set('tags', doc.createNode(value as string[]));
    } else {
      // A cleared case-default scalar is removed entirely rather than written as `null` — the editor
      // YAML never presents `null` as a value.
      const stringValue = value as string;
      if (stringValue.length === 0) {
        doc.delete(field);
      } else {
        doc.set(field, stringValue);
      }
    }

    // Keep the buffer canonical: a newly added case default slots into render-panel order (rather
    // than being appended at the bottom) and the custom `fields` block stays last.
    reorderTemplateDefinitionKeys(doc);
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
  initialSettings,
}) => {
  const styles = useMemoCss(componentStyles);
  const { getCasesTemplatesUrl, navigateToCasesTemplates } = useCasesTemplatesNavigation();

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

  // The editor "blueprint" buffer holds only case defaults + fields — never template identity,
  // settings, or the connector. Seed the case-default keys so they are always visible, then strip
  // any settings/connector blocks (they are lifted into panel state below and merged back on save).
  const initialDefinitionYaml = useMemo(
    () =>
      stripTemplateConfigBlocks(
        seedRequiredTemplateBlocks(normalizeTemplateDefinitionYaml(initialValue))
      ),
    [initialValue]
  );
  // The settings + connector lifted out of the loaded definition — the seed for the panel state.
  // When the definition carries no settings block (a new template), fall back to `initialSettings`
  // so create can apply solution-aware defaults; an existing settings block always wins.
  const initialConfig = useMemo(() => {
    const extracted = getTemplateSettingsAndConnectorFromYaml(
      normalizeTemplateDefinitionYaml(initialValue)
    );
    return { connector: extracted.connector, settings: extracted.settings ?? initialSettings };
  }, [initialValue, initialSettings]);
  // Template metadata (name/description/tags) is edited in the "Template details" section and saved
  // on the template's attributes — it is NOT part of the YAML. It is drafted in local storage so a
  // refresh never drops unsaved identity changes.
  const initialMetadataState = useMemo<MetadataDraft>(
    () => ({ ...initialMetadata, templateId }),
    [initialMetadata, templateId]
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
        : initialMetadata,
    [useStoredMetadataState, storedMetadataState, initialMetadata]
  );
  const metadataErrors = useMemo<TemplateMetadataErrors>(
    () => validateTemplateMetadata(metadata),
    [metadata]
  );

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

  // Panel-owned settings + connector, drafted in local storage (keyed by templateId) so a refresh
  // never drops unsaved configuration. Seeded from the loaded definition; edited only on the
  // Configuration tab; merged back into the definition on save.
  const initialConfigState = useMemo<TemplateConfigDraft>(
    () => ({ templateId, settings: initialConfig.settings, connector: initialConfig.connector }),
    [initialConfig, templateId]
  );
  const [storedConfigState, setStoredConfigState] = useCasesLocalStorage<TemplateConfigDraft>(
    `${storageKey}.config`,
    initialConfigState
  );
  const useStoredConfigState =
    storedConfigState != null && storedConfigState.templateId === templateId;
  const settings = useStoredConfigState ? storedConfigState.settings : initialConfig.settings;
  const connector = useStoredConfigState ? storedConfigState.connector : initialConfig.connector;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const connectorRef = useRef(connector);
  connectorRef.current = connector;

  const hasChanges = useMemo(() => {
    // A pure diff: any change to the YAML (added, modified, OR removed lines) marks the editor dirty.
    // Comparing the normalized strings directly is intentional — a line-level "changed lines" count
    // misses pure deletions (removing a field leaves no changed line in the current doc), which would
    // hide the revert action even though the definition changed.
    const yamlChanged =
      normalizeYamlString(initialDefinitionYaml) !== normalizeYamlString(normalizedYamlValue);
    const metadataChanged = !isEqual(
      normalizeTemplateMetadata(metadata),
      normalizeTemplateMetadata(initialMetadata)
    );
    // Settings/connector are panel state, so compare them independently of the YAML. Normalizing
    // collapses each to its canonical form (e.g. `.none` / default toggles → "unset") so a no-op
    // never reads as dirty.
    const settingsChanged = !isEqual(
      normalizeTemplateSettings(settings),
      normalizeTemplateSettings(initialConfig.settings)
    );
    const connectorChanged = !isEqual(
      normalizeTemplateConnector(connector),
      normalizeTemplateConnector(initialConfig.connector)
    );
    return yamlChanged || metadataChanged || settingsChanged || connectorChanged;
  }, [
    initialDefinitionYaml,
    normalizedYamlValue,
    metadata,
    initialMetadata,
    settings,
    connector,
    initialConfig,
  ]);

  const yamlValidationResult = useMemo(
    () => validateTemplateDefinitionYaml(normalizedYamlValue),
    [normalizedYamlValue]
  );
  const isYamlDefinitionValid = yamlValidationResult.success;

  // Only the YAML's structural validity gates the Save button. Template-details validity (e.g. the
  // required name) is checked at submit time against the freshest metadata (see handleSave), so the
  // button stays responsive while the debounced metadata fields settle rather than flickering
  // disabled after every keystroke.
  const hasValidationErrors = useMemo(() => !isYamlDefinitionValid, [isYamlDefinitionValid]);

  // Freshest YAML, updated synchronously on every edit so Save and each subsequent edit build on the
  // latest value even while the debounced persistence hook (and the render-panel forms) lag behind.
  const yamlValueRef = useRef(normalizedYamlValue);
  useEffect(() => {
    yamlValueRef.current = normalizedYamlValue;
  }, [normalizedYamlValue]);

  // Freshest template metadata, kept in a ref for the same reason (the metadata form propagates on a
  // debounce, so Save must not read the lagging `metadata` state).
  const metadataRef = useRef(metadata);
  useEffect(() => {
    metadataRef.current = metadata;
  }, [metadata]);

  const handleYamlChange = useCallback(
    (nextYaml: string) => {
      const normalized = normalizeTemplateDefinitionYaml(nextYaml);
      yamlValueRef.current = normalized;
      onYamlChange(normalized);
    },
    [onYamlChange]
  );

  const handleSettingsChange = useCallback(
    (next: TemplateSettings) => {
      // Settings are panel state, not YAML — update the draft (and the synchronous ref so Save reads
      // the latest immediately). Both keys are kept explicit so "off" is a real `false`.
      const explicit = getExplicitTemplateSettings(next);
      settingsRef.current = explicit;
      setStoredConfigState({ templateId, settings: explicit, connector: connectorRef.current });
    },
    [setStoredConfigState, templateId]
  );

  const handleConnectorChange = useCallback(
    (next: CaseConnectorWithoutName) => {
      // Connector is panel state, not YAML — update the draft (and the synchronous ref). No YAML
      // re-serialization, so a flaky connector fetch can never dirty or reset the editor buffer.
      connectorRef.current = next;
      setStoredConfigState({ templateId, settings: settingsRef.current, connector: next });
    },
    [setStoredConfigState, templateId]
  );

  const handleMetadataChange = useCallback(
    (next: TemplateMetadata) => {
      // Template identity is not part of the YAML — only the draft/attributes track it. Update the
      // synchronous ref first so Save reads the latest even before the state re-render lands.
      metadataRef.current = next;
      setStoredMetadataState({ ...next, templateId });
    },
    [setStoredMetadataState, templateId]
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
      } else if (control === FieldType.TOGGLE) {
        parsedValue = value === 'true';
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
    (field: EditableCaseDefaultField, value: EditableCaseDefaultValue) => {
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
    setStoredConfigState(initialConfigState);
    // Sync the refs immediately so a Save right after Reset uses the restored config.
    settingsRef.current = initialConfig.settings;
    connectorRef.current = initialConfig.connector;
    // Remount the connector picker so it re-seeds from the restored connector.
    setFormResetKey((count) => count + 1);
    setIsResetModalVisible(false);
  }, [
    handleReset,
    setStoredMetadataState,
    initialMetadataState,
    setStoredConfigState,
    initialConfigState,
    initialConfig,
  ]);

  const handleResetCancel = useCallback(() => {
    setIsResetModalVisible(false);
  }, []);

  const handleSave = useCallback(() => {
    setSubmitError(null);

    // Read the synchronous refs (not the debounced state) so a value typed immediately before
    // clicking Save is never lost. Template identity comes from the Configuration tab and is
    // persisted on the saved-object attributes — never in the definition. The persisted definition
    // is the edited blueprint (legacy top-level `title` canonicalized into `name`) with the
    // panel-owned settings + connector merged back in, so the stored definition stays complete.
    const normalizedMetadata = normalizeTemplateMetadata(metadataRef.current);
    const mergedDefinition = mergeTemplateDefinition(
      normalizeTemplateCaseDefaultsYaml(yamlValueRef.current),
      { settings: settingsRef.current, connector: connectorRef.current }
    );

    const validationResult = validateTemplateDefinitionYaml(mergedDefinition);
    if (
      !validationResult.success ||
      hasTemplateMetadataErrors(validateTemplateMetadata(normalizedMetadata))
    ) {
      setSubmitError(i18n.FIX_VALIDATION_ERRORS);
      return;
    }

    form.handleSubmit(
      async (data) => {
        try {
          await onCreate({ ...data, definition: mergedDefinition }, normalizedMetadata, isEnabled);
          clearDraft(isEdit ? mergedDefinition : undefined);
          // Reset/advance ALL drafts on success so a subsequent create doesn't restore this
          // template's identity OR config (settings/connector). On edit, the drafts become the
          // just-saved values.
          setStoredMetadataState(
            isEdit ? { ...normalizedMetadata, templateId } : initialMetadataState
          );
          setStoredConfigState(
            isEdit
              ? { templateId, settings: settingsRef.current, connector: connectorRef.current }
              : initialConfigState
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
    setStoredMetadataState,
    setStoredConfigState,
    templateId,
    initialMetadataState,
    initialConfigState,
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

  // Only Security Solution renders the fixed timeline bottom bar, so only it needs the reservation.
  const { owner } = useCasesContext();
  const bodyHeightOffset = getTemplateEditorBodyOffset(owner);

  return (
    <FormProvider {...form}>
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        // Reserve space for the Security Solution timeline bottom bar (only present for that owner —
        // see bodyHeightOffset) so the split editor runs to the page bottom without overlapping the
        // bar on Security or leaving dead space elsewhere.
        css={kbnFullBodyHeightCss(bodyHeightOffset)}
      >
        <EuiFlexItem grow={false}>
          <CasesAppHeader
            title={title}
            back={templateFormBack}
            badges={templateFormBadges}
            menu={templateFormMenu}
          />
        </EuiFlexItem>

        <EuiFlexItem css={styles.fullHeightEditorWrapper}>
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
            fieldsHaveErrors={hasValidationErrors}
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
