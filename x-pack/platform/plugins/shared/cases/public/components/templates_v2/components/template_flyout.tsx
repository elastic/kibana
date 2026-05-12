/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useRef } from 'react';
import { EuiFlyout, EuiFlyoutBody } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from '../translations';
import type { ValidatedFile, FileValidationError } from '../hooks/use_validate_yaml';
import { useParseYaml } from '../hooks/use_parse_yaml';
import type { ParsedTemplateEntry, ParseYamlError } from '../hooks/use_parse_yaml';
import { useImportTemplates } from '../hooks/use_import_templates';
import { useImportSteps, ImportStep } from '../hooks/use_import_steps';
import { UploadYamlStep } from './upload_yaml_step';
import { SelectTemplatesStep } from './select_templates_step';
import { TemplateFlyoutHeader } from './template_flyout_header';
import { TemplateFlyoutFooter } from './template_flyout_footer';
import { TemplatePreviewPanel } from './template_preview_panel';

export interface TemplateFlyoutProps {
  onClose: () => void;
  onImport: () => void;
}

export const TemplateFlyout = React.memo<TemplateFlyoutProps>(({ onClose, onImport }) => {
  const flyoutRef = useRef<HTMLDivElement>(null);

  const [validatedFiles, setValidatedFiles] = useState<ValidatedFile[]>([]);
  const [validationErrors, setValidationErrors] = useState<FileValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const [parsedTemplates, setParsedTemplates] = useState<ParsedTemplateEntry[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseYamlError[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const [selectedTemplates, setSelectedTemplates] = useState<ParsedTemplateEntry[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<ParsedTemplateEntry | null>(null);

  const { parseFiles } = useParseYaml();
  const { importTemplates, isImporting } = useImportTemplates();

  const hasValidFiles = validatedFiles.length > 0;

  const { currentStep, horizontalSteps, isFirstStep, isLastStep, goToStep } = useImportSteps({
    isSelectEnabled: hasValidFiles,
  });

  const onValidationStart = useCallback(() => {
    setIsValidating(true);
  }, []);

  const onValidationComplete = useCallback(
    (result: { validFiles: ValidatedFile[]; errors: FileValidationError[] }) => {
      setValidatedFiles(result.validFiles);
      setValidationErrors(result.errors);
      setIsValidating(false);
    },
    []
  );

  const goToSelectStep = useCallback(async () => {
    setIsParsing(true);
    const result = await parseFiles(validatedFiles);
    setParsedTemplates(result.templates);
    setParseErrors(result.errors);
    setIsParsing(false);
    goToStep(ImportStep.SelectTemplates);
  }, [parseFiles, validatedFiles, goToStep]);

  const handleImport = useCallback(async () => {
    const result = await importTemplates(selectedTemplates);
    if (result.failed === 0) {
      onImport();
    }
  }, [importTemplates, selectedTemplates, onImport]);

  const handleRowClick = useCallback((template: ParsedTemplateEntry) => {
    setPreviewTemplate((prev) =>
      prev?.sourceFileName === template.sourceFileName &&
      prev?.documentIndex === template.documentIndex
        ? null
        : template
    );
  }, []);

  const closePreview = useCallback(() => {
    setPreviewTemplate(null);
  }, []);

  const goBackToUpload = useCallback(() => {
    goToStep(ImportStep.UploadYaml);
  }, [goToStep]);

  return (
    <EuiFlyout
      ref={flyoutRef}
      onClose={onClose}
      aria-label={i18n.IMPORT_TEMPLATE}
      data-test-subj="template-flyout"
    >
      <TemplateFlyoutHeader steps={horizontalSteps} />
      <EuiFlyoutBody
        css={css`
          .euiFlyoutBody__overflowContent {
            height: 100%;
          }
        `}
      >
        <div
          css={css`
            height: 100%;
            display: ${currentStep === ImportStep.UploadYaml ? 'block' : 'none'};
          `}
        >
          <UploadYamlStep
            validatedFiles={validatedFiles}
            validationErrors={validationErrors}
            isValidating={isValidating}
            onValidationStart={onValidationStart}
            onValidationComplete={onValidationComplete}
          />
        </div>
        <div
          css={css`
            display: ${currentStep === ImportStep.SelectTemplates ? 'block' : 'none'};
            height: 100%;
          `}
          data-test-subj="template-flyout-step-select"
        >
          <SelectTemplatesStep
            templates={parsedTemplates}
            errors={parseErrors}
            onSelectionChange={setSelectedTemplates}
            onRowClick={handleRowClick}
          />
        </div>
      </EuiFlyoutBody>
      <TemplateFlyoutFooter
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        isNextDisabled={!hasValidFiles || isValidating || isParsing}
        isNextLoading={isValidating || isParsing}
        isImportDisabled={selectedTemplates.length === 0 || isImporting}
        isImportLoading={isImporting}
        selectedCount={selectedTemplates.length}
        onCancel={onClose}
        onBack={goBackToUpload}
        onNext={goToSelectStep}
        onImport={handleImport}
      />
      {previewTemplate && (
        <TemplatePreviewPanel
          template={previewTemplate}
          onClose={closePreview}
          flyoutRef={flyoutRef}
        />
      )}
    </EuiFlyout>
  );
});

TemplateFlyout.displayName = 'TemplateFlyout';
