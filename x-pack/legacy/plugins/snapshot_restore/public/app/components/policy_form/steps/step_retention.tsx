/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';

import {
  EuiDescribedFormGroup,
  EuiTitle,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiSelect,
} from '@elastic/eui';

import { SlmPolicyPayload } from '../../../../../common/types';
import { TIME_UNITS } from '../../../../../common/constants';
import { documentationLinksService } from '../../../services/documentation';
import { useAppDependencies } from '../../../index';
import { StepProps } from './';
import { textService } from '../../../services/text';

const getExpirationTimeOptions = (unitSize = '0') =>
  Object.entries(TIME_UNITS).map(([_key, value]) => {
    return {
      text: textService.getTimeUnitLabel(value, unitSize),
      value,
    };
  });

export const PolicyStepRetention: React.FunctionComponent<StepProps> = ({
  policy,
  updatePolicy,
  errors,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;

  const { retention = {} } = policy;

  const updatePolicyRetention = (updatedFields: Partial<SlmPolicyPayload['retention']>): void => {
    const newRetention = { ...retention, ...updatedFields };
    updatePolicy({
      retention: newRetention,
    });
  };

  // State for touched inputs
  const [touched, setTouched] = useState({
    expireAfterValue: false,
    minCount: false,
    maxCount: false,
  });
  const renderExpireAfterField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepRetention.expirationDescriptionTitle"
              defaultMessage="Expiration"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepRetention.expirationDescription"
          defaultMessage="Time period before a snapshot should be deleted."
        />
      }
      idAria="expirationDescription"
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepRetention.expireAfterLabel"
            defaultMessage="Delete after"
          />
        }
        describedByIds={['expirationDescription']}
        isInvalid={touched.expireAfterValue && Boolean(errors.expireAfterValue)}
        error={errors.expireAfter}
        fullWidth
      >
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFieldNumber
              value={retention.expireAfterValue || ''}
              onBlur={() => setTouched({ ...touched, expireAfterValue: true })}
              onChange={e => {
                const value = e.target.value;
                updatePolicyRetention({
                  expireAfterValue: value !== '' ? Number(value) : value,
                });
              }}
              data-test-subj="expireAfterValueInput"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSelect
              value={retention.expireAfterUnit}
              options={getExpirationTimeOptions(
                retention.expireAfterValue ? retention.expireAfterValue.toString() : undefined
              )}
              onChange={e => {
                updatePolicyRetention({
                  expireAfterUnit: e.target.value,
                });
              }}
              data-test-subj="expireAfterUnitSelect"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderCountFields = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepRetention.countDescriptionTitle"
              defaultMessage="Count"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepRetention.countDescription"
          defaultMessage="Configure the minimum and maximum number of snapshots that should be retained."
        />
      }
      idAria="countDescription"
      fullWidth
    >
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepRetention.minCountLabel"
                defaultMessage="Mininum"
              />
            }
            describedByIds={['countDescription']}
            isInvalid={touched.minCount && Boolean(errors.minCount)}
            error={errors.minCount}
            fullWidth
          >
            <EuiFieldNumber
              fullWidth
              value={retention.minCount || ''}
              onBlur={() => setTouched({ ...touched, minCount: true })}
              onChange={e => {
                const value = e.target.value;
                updatePolicyRetention({
                  minCount: value !== '' ? Number(value) : value,
                });
              }}
              data-test-subj="minCountInput"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepRetention.maxCountLabel"
                defaultMessage="Maximum"
              />
            }
            describedByIds={['countDescription']}
            error={errors.maxCount}
            fullWidth
          >
            <EuiFieldNumber
              fullWidth
              value={retention.maxCount || ''}
              onBlur={() => setTouched({ ...touched, maxCount: true })}
              onChange={e => {
                const value = e.target.value;
                updatePolicyRetention({
                  maxCount: value !== '' ? Number(value) : value,
                });
              }}
              data-test-subj="maxCountInput"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiDescribedFormGroup>
  );

  return (
    <Fragment>
      {/* Step title and doc link */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepRetentionTitle"
                defaultMessage="Snapshot retention (optional)"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={documentationLinksService.getSlmUrl()}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepRetention.docsButtonLabel"
              defaultMessage="Snapshot retention docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/** Expiration field */}
      {renderExpireAfterField()}
      {/** Retention count fields */}
      {renderCountFields()}
    </Fragment>
  );
};
