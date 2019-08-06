/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';

import {
  EuiDescribedFormGroup,
  EuiTitle,
  EuiFormRow,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { SlmPolicyPayload } from '../../../../../common/types';
import { documentationLinksService } from '../../../services/documentation';
import { useAppDependencies } from '../../../index';
import { StepProps } from './';

export const PolicyStepSettings: React.FunctionComponent<StepProps> = ({
  policy,
  updatePolicy,
  errors,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const { config = {} } = policy;

  const updatePolicyConfig = (updatedFields: Partial<SlmPolicyPayload['config']>): void => {
    const newConfig = { ...config, ...updatedFields };
    updatePolicy({
      config: newConfig,
    });
  };

  const renderIndicesField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepLogistics.indicesDescriptionTitle"
              defaultMessage="Indices"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepLogistics.indicesDescription"
          defaultMessage="Indices to back up."
        />
      }
      idAria="indicesDescription"
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepLogistics.indicesLabel"
            defaultMessage="Indices"
          />
        }
        describedByIds={['indicesDescription']}
        isInvalid={Boolean(errors.indices)}
        error={errors.indices}
        fullWidth
      >
        <EuiFieldText
          defaultValue={config.indices}
          fullWidth
          onChange={e => {
            const indices = e.target.value.trim();
            updatePolicyConfig({
              indices: indices || undefined,
            });
          }}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderIgnoreUnavailableField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.ignoreUnavailableDescriptionTitle"
              defaultMessage="Ignore unavailable indices"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.ignoreUnavailableDescription"
          defaultMessage="Indices that do not exist will be ignored during snapshot creation.
            Otherwise missing indices will cause snapshot creation to fail."
        />
      }
      idAria="policyIgnoreUnavailableDescription"
      fullWidth
    >
      <EuiFormRow
        hasEmptyLabelSpace
        describedByIds={['policyIgnoreUnavailableDescription']}
        fullWidth
      >
        <EuiSwitch
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.ignoreUnavailableLabel"
              defaultMessage="Ignore unavailable indices"
            />
          }
          checked={config.ignoreUnavailable}
          onChange={e => {
            updatePolicyConfig({
              ignoreUnavailable: e.target.checked,
            });
          }}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderPartialField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.partialDescriptionTitle"
              defaultMessage="Allow partial indices"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.partialDescription"
          defaultMessage="Allows snapshot to be taken when one or more indices participating
            in the snapshot don't have all primary shards available. Otherwise the entire
            snapshot will fail."
        />
      }
      idAria="policyPartialDescription"
      fullWidth
    >
      <EuiFormRow hasEmptyLabelSpace describedByIds={['policyPartialDescription']} fullWidth>
        <EuiSwitch
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.partialLabel"
              defaultMessage="Allow partial indices"
            />
          }
          checked={config.partial}
          onChange={e => {
            updatePolicyConfig({
              partial: e.target.checked,
            });
          }}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderIncludeGlobalStateField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.includeGlobalStateDescriptionTitle"
              defaultMessage="Include global state"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.includeGlobalStateDescription"
          defaultMessage="Stores the cluster global state as part of the snapshot."
        />
      }
      idAria="policyIncludeGlobalStateDescription"
      fullWidth
    >
      <EuiFormRow
        hasEmptyLabelSpace
        describedByIds={['policyIncludeGlobalStateDescription']}
        fullWidth
      >
        <EuiSwitch
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.policyIncludeGlobalStateLabel"
              defaultMessage="Include global state"
            />
          }
          checked={config.includeGlobalState === undefined || config.includeGlobalState}
          onChange={e => {
            updatePolicyConfig({
              includeGlobalState: e.target.checked,
            });
          }}
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
                id="xpack.snapshotRestore.policyForm.stepSettingsTitle"
                defaultMessage="Snapshot settings"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={documentationLinksService.getSnapshotDocUrl()}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.docsButtonLabel"
              defaultMessage="Settings docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />

      {renderIndicesField()}
      {renderIgnoreUnavailableField()}
      {renderPartialField()}
      {renderIncludeGlobalStateField()}
    </Fragment>
  );
};
