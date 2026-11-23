/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import React from 'react';
import {
  EuiCallOut,
  EuiHorizontalRule,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ExtendedFieldsForm } from '../fields/extended_fields_form';
import type { ExtendedFieldsFormApi } from '../fields/extended_fields_form';
import { useGlobalFields } from '../fields/use_global_fields';
import * as fieldsI18n from '../fields/translations';

export interface GlobalFieldsSectionProps {
  /** The chosen template, when there is one: its `$ref`s to global fields are drawn with it. */
  templateId?: string;
  templateVersion?: number;
  formApiRef: MutableRefObject<ExtendedFieldsFormApi | null>;
  onDirtyChange: (isDirty: boolean) => void;
}

/** The global fields of the owner, drawn with the Cases field components, with or without a template. */
export const GlobalFieldsSection: React.FC<GlobalFieldsSectionProps> = ({
  templateId,
  templateVersion,
  formApiRef,
  onDirtyChange,
}) => {
  const { fields, isLoading, isError } = useGlobalFields(templateId, templateVersion);

  if (isLoading) {
    return (
      <>
        <EuiHorizontalRule margin="m" />
        <EuiSkeletonText lines={2} aria-label={fieldsI18n.GLOBAL_FIELDS_LOADING} />
      </>
    );
  }
  if (isError) {
    return (
      <>
        <EuiHorizontalRule margin="m" />
        <EuiCallOut
          announceOnMount
          size="s"
          color="danger"
          title={fieldsI18n.GLOBAL_FIELDS_ERROR}
          data-test-subj="investigationCreateGlobalFieldsError"
        />
      </>
    );
  }
  if (fields.length === 0) {
    return null;
  }

  return (
    <>
      <EuiHorizontalRule margin="m" />
      <EuiTitle size="xxs">
        <h3>{fieldsI18n.GLOBAL_FIELDS_TITLE}</h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {fieldsI18n.GLOBAL_FIELDS_HELP}
      </EuiText>
      <EuiSpacer size="s" />
      <div data-test-subj="investigationCreateGlobalFields">
        <ExtendedFieldsForm
          key={fields.map(({ name }) => name).join('|')}
          fields={fields}
          applyTemplateDefaults
          formApiRef={formApiRef}
          onDirtyChange={onDirtyChange}
        />
      </div>
    </>
  );
};
GlobalFieldsSection.displayName = 'GlobalFieldsSection';
