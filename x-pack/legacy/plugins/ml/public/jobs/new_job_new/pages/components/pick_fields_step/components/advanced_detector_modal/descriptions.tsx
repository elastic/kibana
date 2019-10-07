/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

interface Props {
  children: JSX.Element;
}

export const AggDescription: FC<Props> = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.aggSelect.title',
    {
      defaultMessage: 'Function',
    }
  );
  return (
    <EuiDescribedFormGroup
      idAria="description"
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.aggSelect.description"
          defaultMessage="Blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah "
        />
      }
    >
      <EuiFormRow label={title} describedByIds={['description']}>
        {children}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});

export const FieldDescription: FC<Props> = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.fieldSelect.title',
    {
      defaultMessage: 'Field',
    }
  );
  return (
    <EuiDescribedFormGroup
      idAria="description"
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.fieldSelect.description"
          defaultMessage="Blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah "
        />
      }
    >
      <EuiFormRow label={title} describedByIds={['description']}>
        {children}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});

export const ByFieldDescription: FC<Props> = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.byFieldSelect.title',
    {
      defaultMessage: 'By field',
    }
  );
  return (
    <EuiDescribedFormGroup
      idAria="description"
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.byFieldSelect.description"
          defaultMessage="Blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah "
        />
      }
    >
      <EuiFormRow label={title} describedByIds={['description']}>
        {children}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});

export const OverFieldDescription: FC<Props> = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.overFieldSelect.title',
    {
      defaultMessage: 'Over field',
    }
  );
  return (
    <EuiDescribedFormGroup
      idAria="description"
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.overFieldSelect.description"
          defaultMessage="Blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah "
        />
      }
    >
      <EuiFormRow label={title} describedByIds={['description']}>
        {children}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});

export const PartitionFieldDescription: FC<Props> = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.partitionFieldSelect.title',
    {
      defaultMessage: 'Partition field',
    }
  );
  return (
    <EuiDescribedFormGroup
      idAria="description"
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.partitionFieldSelect.description"
          defaultMessage="Blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah "
        />
      }
    >
      <EuiFormRow label={title} describedByIds={['description']}>
        {children}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});

export const ExcludeFrequentDescription: FC<Props> = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.excludeFrequent.title',
    {
      defaultMessage: 'Exclude frequent',
    }
  );
  return (
    <EuiDescribedFormGroup
      idAria="description"
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.excludeFrequent.description"
          defaultMessage="Blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah "
        />
      }
    >
      <EuiFormRow label={title} describedByIds={['description']}>
        {children}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
