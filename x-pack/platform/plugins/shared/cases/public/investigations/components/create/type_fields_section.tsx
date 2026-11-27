/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import React from 'react';
import { EuiCallOut, EuiHorizontalRule, EuiSkeletonText, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { InvestigationType } from '../../../../common/investigations/types';
import { ExtendedFieldsForm } from '../fields/extended_fields_form';
import type { ExtendedFieldsFormApi } from '../fields/extended_fields_form';
import { useTypeFields } from '../fields/use_type_fields';
import * as fieldsI18n from '../fields/translations';
import * as i18n from './translations';

export interface TypeFieldsSectionProps {
  type: InvestigationType;
  formApiRef: MutableRefObject<ExtendedFieldsFormApi | null>;
  onDirtyChange: (isDirty: boolean) => void;
}

/** The fields of the chosen investigation type, drawn with the Cases field components. */
export const TypeFieldsSection: React.FC<TypeFieldsSectionProps> = ({
  type,
  formApiRef,
  onDirtyChange,
}) => {
  const { fields, isLoading, isError } = useTypeFields(type.template_id, type.version);

  if (isLoading) {
    return (
      <>
        <EuiHorizontalRule margin="m" />
        <EuiSkeletonText lines={3} aria-label={fieldsI18n.FIELDS_LOADING} />
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
          title={fieldsI18n.FIELDS_ERROR}
          data-test-subj="investigationCreateFieldsError"
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
        <h3>{i18n.TYPE_FIELDS_SECTION(type.name)}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <div data-test-subj="investigationCreateTypeFields">
        <ExtendedFieldsForm
          key={type.template_id}
          fields={fields}
          applyTemplateDefaults
          formApiRef={formApiRef}
          onDirtyChange={onDirtyChange}
        />
      </div>
    </>
  );
};
TypeFieldsSection.displayName = 'TypeFieldsSection';
