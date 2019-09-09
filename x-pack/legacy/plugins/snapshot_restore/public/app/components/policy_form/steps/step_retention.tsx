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
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiSpacer,
  EuiFieldNumber,
} from '@elastic/eui';

import { SlmPolicyPayload } from '../../../../../common/types';
import { documentationLinksService } from '../../../services/documentation';
import { useAppDependencies } from '../../../index';
import { StepProps } from './';

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
    expireAfter: false,
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
            defaultMessage="Expire after"
          />
        }
        describedByIds={['expirationDescription']}
        isInvalid={touched.expireAfter && Boolean(errors.expireAfter)}
        error={errors.expireAfter}
        fullWidth
      >
        <EuiFieldText
          defaultValue={retention.expireAfter}
          fullWidth
          onBlur={() => setTouched({ ...touched, expireAfter: true })}
          onChange={e => {
            updatePolicyRetention({
              expireAfter: e.target.value,
            });
          }}
          placeholder={i18n.translate(
            'xpack.snapshotRestore.policyForm.stepRetention.expireAfterPlaceholder',
            {
              defaultMessage: '15d',
              description: 'Example expiration value',
            }
          )}
          data-test-subj="expireAfterInput"
        />
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
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepRetention.minCountLabel"
            defaultMessage="Min count"
          />
        }
        describedByIds={['countDescription']}
        isInvalid={touched.minCount && Boolean(errors.minCount)}
        error={errors.minCount}
        fullWidth
      >
        <EuiFieldNumber
          fullWidth
          value={retention.minCount}
          onBlur={() => setTouched({ ...touched, minCount: true })}
          onChange={e => {
            updatePolicyRetention({
              minCount: Number(e.target.value),
            });
          }}
          data-test-subj="minCountInput"
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepRetention.maxCountLabel"
            defaultMessage="Max count"
          />
        }
        describedByIds={['countDescription']}
        isInvalid={touched.maxCount && Boolean(errors.maxCount)}
        error={errors.maxCount}
        fullWidth
      >
        <EuiFieldNumber
          fullWidth
          value={retention.maxCount}
          onBlur={() => setTouched({ ...touched, maxCount: true })}
          onChange={e => {
            updatePolicyRetention({
              maxCount: Number(e.target.value),
            });
          }}
          data-test-subj="maxCountInput"
        />
      </EuiFormRow>
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
            href={documentationLinksService.getSlmUrl()} // TODO verify correct docs link
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
      <EuiSpacer size="l" />

      {renderExpireAfterField()}
      {renderCountFields()}
    </Fragment>
  );
};
