/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { FormProvider, useForm } from 'react-hook-form';
import {
  UseField,
  useFormContext as useParentFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { CASE_EXTENDED_FIELDS } from '../../../common/constants';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useTemplateFormSync } from './use_template_form_sync';
import { FieldsRenderer } from '../templates_v2/field_types/field_renderer';
import { useResolvedFields } from '../field_library/hooks/use_resolved_fields';
import { useGetFieldDefinitions } from '../field_library/hooks/use_get_field_definitions';
import {
  buildExtendedFieldsDefaults,
  collectNormalizedRefNames,
  excludeRefFieldsToDefinitions,
  normalizeFieldDefinitionName,
  parseFieldDefinitionsToInlineFields,
  getFieldSnakeKey,
} from '../../../common/utils';
import { TemplateFieldsValidationContext } from './template_fields_validation_context';
import { CUSTOM_FIELDS } from '../case_form_fields/translations';

type FormShape = Record<string, Record<string, unknown>>;

interface CreateCaseTemplateFieldsProps {
  /**
   * When true, adds top spacing so fields don't sit flush against Description.
   * Omit (or false) when a divider already separates this block from content above.
   */
  addTopSpacing?: boolean;
  /**
   * `legacyKey`s of the legacy (v1) custom fields currently rendered as inputs elsewhere on
   * this form (see `CaseFormFields`). A global field definition linked to one of these keys is
   * excluded below so it isn't shown a second time here — without this, the untouched global
   * control would submit its default/empty value as an explicit `extended_fields` entry
   * alongside the legacy `customFields` value for the same linked field, which the write path
   * treats as a genuine dual-input conflict (`FIELD_REPRESENTATIONS_CONFLICT`).
   */
  visibleLegacyCustomFieldKeys?: ReadonlySet<string>;
}

export const CreateCaseTemplateFields: React.FC<CreateCaseTemplateFieldsProps> = ({
  addTopSpacing = false,
  visibleLegacyCustomFieldKeys,
}) => {
  const parentForm = useParentFormContext();
  const [{ templateId }] = useFormData<{ templateId?: string }>({ watch: ['templateId'] });
  const { owner } = useCasesContext();
  // The create form is always rendered inside a single-solution CasesContext, so
  // owner is effectively a single-element array. Taking the first element is safe here.
  const ownerStr = Array.isArray(owner) ? owner[0] : owner;

  // Fetch isGlobal field definitions for this owner.
  // staleTime: Infinity — field definitions don't change during a user session, so we
  // prevent background refetches that would create a new Set object reference, re-run the
  // useTemplateFormSync effect, and unexpectedly reset the form.
  const { data: globalFieldDefsData, isLoading: isLoadingGlobalDefs } = useGetFieldDefinitions({
    owner: ownerStr,
    isGlobal: true,
    staleTime: Infinity,
  });

  // Resolve global field definitions to inline fields and compute their snake keys.
  // globalFieldKeys tracks ALL global fields for form-state preservation in useTemplateFormSync,
  // even those hidden because the active template already renders them via $ref.
  //
  // A definition linked (via legacyKey) to a legacy custom field that is itself visible on this
  // form is dropped before parsing — it already has an input in the legacy section, and
  // rendering it here too would let its untouched control submit a conflicting extended_fields
  // entry (see the prop doc above). The same exclusion must apply to template `$ref`s targeting
  // those definitions (see excludedLinkedRefNames below): filtering only the global section
  // would still let a migrated template render and submit a second control for the linked field.
  const { globalInlineFields, globalFieldKeys, excludedLinkedRefNames, excludedLinkedStorageKeys } =
    useMemo(() => {
      const allDefs = globalFieldDefsData?.fieldDefinitions ?? [];
      const isExcluded = (def: (typeof allDefs)[number]): boolean =>
        def.legacyKey !== undefined && Boolean(visibleLegacyCustomFieldKeys?.has(def.legacyKey));
      const excludedDefs = allDefs.filter(isExcluded);
      const defs = allDefs.filter((def) => !isExcluded(def));
      const inlineFields = parseFieldDefinitionsToInlineFields(defs);
      const keys = new Set(inlineFields.map((f) => getFieldSnakeKey(f.name, f.type)));
      return {
        globalInlineFields: inlineFields,
        globalFieldKeys: keys,
        // Normalized definition names whose template `$ref`s must not render or submit — the
        // linked legacy custom field already provides this form's single input for them.
        excludedLinkedRefNames: new Set(
          excludedDefs.map((d) => normalizeFieldDefinitionName(d.name))
        ) as ReadonlySet<string>,
        // Their storage keys, for scrubbing stale values out of form state when legacy
        // visibility flips on after the form initialized (e.g. the forced-on switch resolves
        // once the configuration finishes loading).
        excludedLinkedStorageKeys: new Set(
          parseFieldDefinitionsToInlineFields(excludedDefs).map((f) =>
            getFieldSnakeKey(f.name, f.type)
          )
        ) as ReadonlySet<string>,
      };
    }, [globalFieldDefsData, visibleLegacyCustomFieldKeys]);

  const innerForm = useForm<FormShape>({
    defaultValues: { [CASE_EXTENDED_FIELDS]: {} },
  });

  // Mirror the inner RHF `extendedFields` slice into the parent form_lib field
  // on every change so the parent's submission picks up the latest values.
  // IMPORTANT: this effect must be registered before any effect that calls
  // innerForm.reset(), so that the watch callback is in place when those resets fire.
  useEffect(() => {
    const subscription = innerForm.watch((values) => {
      const slice = values?.[CASE_EXTENDED_FIELDS] ?? {};
      parentForm.setFieldValue(CASE_EXTENDED_FIELDS, slice);
    });
    return () => subscription.unsubscribe();
  }, [innerForm, parentForm]);

  // Apply global field defaults exactly once after definitions load. useTemplateFormSync
  // preserves these values when templates are selected/changed.
  const globalDefaultsAppliedRef = useRef(false);
  useEffect(() => {
    if (globalDefaultsAppliedRef.current || isLoadingGlobalDefs) return;

    if (!globalInlineFields.length) return;
    globalDefaultsAppliedRef.current = true;

    const defaults = buildExtendedFieldsDefaults(globalInlineFields);

    // Merge with any values already in the form (e.g. from template sync that ran
    // before global defs finished loading) so neither overwrites the other.
    // Filter out empty-string entries: Controller components register with defaultValue=""
    // on mount, which would otherwise shadow the real YAML defaults via the spread.
    const current = (innerForm.getValues()?.[CASE_EXTENDED_FIELDS] ?? {}) as Record<
      string,
      unknown
    >;
    const preservedCurrent = Object.fromEntries(
      Object.entries(current).filter(([, v]) => v !== '' && v !== undefined)
    );
    innerForm.reset({ [CASE_EXTENDED_FIELDS]: { ...defaults, ...preservedCurrent } });
  }, [isLoadingGlobalDefs, globalInlineFields, innerForm]);

  const { template, isLoading } = useTemplateFormSync(
    innerForm,
    globalFieldKeys,
    excludedLinkedRefNames
  );

  // Scrub the storage keys of legacy-visible linked definitions out of the inner form whenever
  // the exclusion set changes. Template-originated values are already handled by the sync hook
  // (its reset replaces the whole map), but values written by the one-shot global-defaults
  // effect above would otherwise linger in form state after "show legacy custom fields" turns
  // on, be mirrored to the parent form, and submit alongside the legacy input — a dual-input
  // conflict the server rejects. The watch subscription registered above mirrors this reset to
  // the parent form's extendedFields field.
  useEffect(() => {
    if (!excludedLinkedStorageKeys.size) return;
    const current = (innerForm.getValues()?.[CASE_EXTENDED_FIELDS] ?? {}) as Record<
      string,
      unknown
    >;
    const staleKeys = Object.keys(current).filter((key) => excludedLinkedStorageKeys.has(key));
    if (!staleKeys.length) return;
    innerForm.reset({
      [CASE_EXTENDED_FIELDS]: Object.fromEntries(
        Object.entries(current).filter(([key]) => !excludedLinkedStorageKeys.has(key))
      ),
    });
  }, [excludedLinkedStorageKeys, innerForm]);

  // Fields referenced by the template via $ref are owned by the template section —
  // exclude them from the global section to avoid duplicate inputs.
  const templateRefNames = useMemo<ReadonlySet<string>>(
    () => collectNormalizedRefNames(template?.definition?.fields),
    [template]
  );

  const visibleGlobalInlineFields = useMemo(
    () =>
      globalInlineFields.filter((f) => !templateRefNames.has(normalizeFieldDefinitionName(f.name))),
    [globalInlineFields, templateRefNames]
  );

  // Register the inner form's trigger with the validation context so the submit
  // button can run RHF Controller validation (pattern, required_when, etc.) before
  // the parent form-lib submits.
  const triggerRef = useContext(TemplateFieldsValidationContext);
  useEffect(() => {
    triggerRef.current = () => innerForm.trigger();
    return () => {
      triggerRef.current = null;
    };
  }, [innerForm, triggerRef]);

  // Drop template `$ref`s to legacy-visible linked definitions BEFORE resolution so the
  // excluded field neither renders nor participates in defaults. Unrelated inline template
  // fields pass through even when their names coincide with an excluded definition.
  const templateDefinitionFields = useMemo(
    () => excludeRefFieldsToDefinitions(template?.definition?.fields, excludedLinkedRefNames),
    [template, excludedLinkedRefNames]
  );

  const { resolvedFields: templateFields, isLoading: isLoadingFieldsRaw } = useResolvedFields(
    templateDefinitionFields,
    template?.owner
  );
  // A disabled query (no templateId) can sit in "loading" state indefinitely in react-query v4;
  // treat it as not-loading so the form renders global fields without a template selected.
  const isLoadingFields = Boolean(templateId) && isLoadingFieldsRaw;

  // Pass each section's fields as condition context to the other so that show_when /
  // required_when conditions can reference fields across the global/template boundary.
  // Without this, a $ref global field whose show_when references another global field in the
  // opposite section would receive an "unknown field" fallback (always-show) from the evaluator.
  const globalFieldsFragment = useMemo(
    () =>
      visibleGlobalInlineFields.length ? (
        <FieldsRenderer
          resolvedFields={visibleGlobalInlineFields}
          conditionContextFields={templateFields}
        />
      ) : null,
    [visibleGlobalInlineFields, templateFields]
  );

  const templateFieldsFragment = useMemo(() => {
    if (!templateId || template?.definition?.fields === undefined) return null;
    if (!templateFields.length) return null;
    return (
      <FieldsRenderer
        resolvedFields={templateFields}
        conditionContextFields={visibleGlobalInlineFields}
      />
    );
  }, [templateId, template, templateFields, visibleGlobalInlineFields]);

  if (isLoading || isLoadingFields || isLoadingGlobalDefs) {
    return <UseField path={CASE_EXTENDED_FIELDS} component={HiddenField} />;
  }

  if (
    !visibleGlobalInlineFields.length &&
    (!templateId || template?.definition?.fields === undefined)
  ) {
    return <UseField path={CASE_EXTENDED_FIELDS} component={HiddenField} />;
  }

  return (
    <>
      <UseField path={CASE_EXTENDED_FIELDS} component={HiddenField} />
      <FormProvider {...innerForm}>
        {/* Parent CaseFormFields uses gutterSize="none"; pad when nothing separates us from Description. */}
        {addTopSpacing ? <EuiSpacer size="m" /> : null}
        {globalFieldsFragment || templateFieldsFragment ? (
          <EuiFormRow fullWidth>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="m">
                  <h3 data-test-subj="create-case-custom-fields-title">{CUSTOM_FIELDS}</h3>
                </EuiText>
              </EuiFlexItem>
              <EuiSpacer size="xs" />
              {globalFieldsFragment}
              {globalFieldsFragment && templateFieldsFragment && <EuiSpacer />}
              {templateFieldsFragment}
            </EuiFlexGroup>
          </EuiFormRow>
        ) : null}
      </FormProvider>
    </>
  );
};

CreateCaseTemplateFields.displayName = 'CreateCaseTemplateFields';
