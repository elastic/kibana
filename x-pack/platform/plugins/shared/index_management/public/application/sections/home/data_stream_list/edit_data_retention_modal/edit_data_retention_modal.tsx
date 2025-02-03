/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiLink,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';
import { has } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isRetentionBiggerThan } from './validations';
import { editDataRetentionFormSchema } from './schema';
import {
  useForm,
  useFormData,
  useFormIsModified,
  Form,
  UseField,
  ToggleField,
  NumericField,
} from '../../../../../shared_imports';

import { documentationService } from '../../../../services/documentation';
import { splitSizeAndUnits, DataStream } from '../../../../../../common';
import { timeUnits } from '../../../../constants/time_units';
import { deserializeGlobalMaxRetention, isDSLWithILMIndices } from '../../../../lib/data_streams';
import { useAppContext } from '../../../../app_context';
import { UnitField } from '../../../../components/shared';
import { updateDataRetention } from '../../../../services/api';
import { MixedIndicesCallout } from './mixed_indices_callout';

interface Props {
  dataStreams: DataStream[];
  ilmPolicyName?: string;
  ilmPolicyLink?: string;
  onClose: (data?: { hasUpdatedDataRetention: boolean }) => void;
  isBulkEdit: boolean;
}

export const EditDataRetentionModal: React.FunctionComponent<Props> = ({
  dataStreams,
  ilmPolicyName,
  ilmPolicyLink,
  onClose,
  isBulkEdit,
}) => {
  const lifecycle = dataStreams[0]?.lifecycle;
  const isSingleDataStream = dataStreams.length === 1;

  const {
    history,
    plugins: { cloud },
  } = useAppContext();
  const dataStreamNames = dataStreams.map(({ name }: DataStream) => name as string);
  const globalMaxRetention = deserializeGlobalMaxRetention(lifecycle?.globalMaxRetention);
  const { size, unit } = isSingleDataStream
    ? splitSizeAndUnits(lifecycle?.data_retention as string)
    : { size: undefined, unit: undefined };

  const {
    services: { notificationService },
    config: { enableTogglingDataRetention, enableProjectLevelRetentionChecks },
  } = useAppContext();

  const { form } = useForm({
    defaultValue: {
      dataRetention: size,
      timeUnit: unit || 'd',
      dataRetentionEnabled: isSingleDataStream ? lifecycle?.enabled : true,
      // When data retention is not set and lifecycle is enabled, is the only scenario in
      // which data retention will be infinite. If lifecycle isnt set or is not enabled, we
      // dont have inifinite data retention.
      infiniteRetentionPeriod:
        isSingleDataStream && lifecycle?.enabled && !lifecycle?.data_retention,
    },
    schema: editDataRetentionFormSchema,
    id: 'editDataRetentionForm',
  });
  const [formData] = useFormData({ form });
  const isDirty = useFormIsModified({ form });

  const formHasErrors = form.getErrors().length > 0;
  const disableSubmit = formHasErrors || !isDirty || form.isValid === false;

  // Whenever the timeUnit field changes, we need to re-validate
  // the dataRetention field
  useEffect(() => {
    if (formData.dataRetention) {
      form.validateFields(['dataRetention']);
    }
  }, [formData.timeUnit, form, formData.dataRetention]);

  const onSubmitForm = async () => {
    const { isValid, data } = await form.submit();

    if (!isValid) {
      return;
    }

    // When enableTogglingDataRetention is disabled (ie: serverless) we don't mount
    // the dataRetentionEnabled field in the UI, which means that the form state for
    // this field regardless if it has defaultValue or if its set with form.setValue.
    // This seems to be a design decision from the formlib and there doesnt seem to
    // be a way around it AFAICT.
    // So when that happens we want to make sure that the dataRetention is always enabled.
    if (!has(data, 'dataRetentionEnabled')) {
      data.dataRetentionEnabled = true;
    }

    return updateDataRetention(dataStreamNames, data).then(({ data: responseData, error }) => {
      if (responseData) {
        // If the response came back with a warning from ES, rely on that for the
        // toast message.
        if (responseData.warning) {
          notificationService.showWarningToast(responseData.warning);
          return onClose({ hasUpdatedDataRetention: true });
        }

        const successMessage = isBulkEdit
          ? i18n.translate(
              'xpack.idxMgmt.dataStreams.editDataRetentionModal.successBulkDataRetentionNotification',
              {
                defaultMessage:
                  'Data retention has been updated for {dataStreamCount, plural, one {one data stream} other {{dataStreamCount} data streams}}.',
                values: { dataStreamCount: dataStreams.length },
              }
            )
          : i18n.translate(
              'xpack.idxMgmt.dataStreams.editDataRetentionModal.successDataRetentionNotification',
              {
                defaultMessage:
                  'Data retention {disabledDataRetention, plural, one { disabled } other { updated } }',
                values: { disabledDataRetention: !data.dataRetentionEnabled ? 1 : 0 },
              }
            );

        notificationService.showSuccessToast(successMessage);

        return onClose({ hasUpdatedDataRetention: true });
      }

      if (error) {
        const errorMessage = isBulkEdit
          ? i18n.translate(
              'xpack.idxMgmt.dataStreams.editDataRetentionModal.errorBulkDataRetentionNotification',
              {
                defaultMessage:
                  'There was an error updating the retention period. Try again later.',
              }
            )
          : i18n.translate(
              'xpack.idxMgmt.dataStreams.editDataRetentionModal.errorDataRetentionNotification',
              {
                defaultMessage: "Error updating data retention: ''{error}''",
                values: { error: error.message },
              }
            );
        notificationService.showDangerToast(errorMessage);
      }

      onClose();
    });
  };

  const affectedDataStreams = dataStreams
    .filter(
      (ds: DataStream) =>
        formData.dataRetention &&
        formData.timeUnit &&
        ((ds.lifecycle?.enabled &&
          !ds.lifecycle?.data_retention &&
          !ds.lifecycle?.effective_retention) ||
          (typeof ds.lifecycle?.data_retention === 'string' &&
            isRetentionBiggerThan(
              ds.lifecycle.data_retention,
              `${formData.dataRetention}${formData.timeUnit}`
            )) ||
          (ds.lifecycle?.effective_retention &&
            isRetentionBiggerThan(
              ds.lifecycle.effective_retention,
              `${formData.dataRetention}${formData.timeUnit}`
            )))
    )
    .map(({ name }: DataStream) => name);

  return (
    <EuiModal
      onClose={() => onClose()}
      data-test-subj="editDataRetentionModal"
      css={{ width: 650 }}
    >
      <Form form={form} data-test-subj="editDataRetentionForm">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {isBulkEdit ? (
              <FormattedMessage
                id="xpack.idxMgmt.dataStreams.editDataRetentionModal.bulkEdit.modalTitleText"
                defaultMessage="Edit data retention for {dataStreamCount} {dataStreamCount, plural, one {data stream} other {data streams}}"
                values={{ dataStreamCount: dataStreams?.length }}
              />
            ) : (
              <FormattedMessage
                id="xpack.idxMgmt.dataStreams.editDataRetentionModal.singleEdit.modalTitleText"
                defaultMessage="Edit data retention"
              />
            )}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {!isBulkEdit && isDSLWithILMIndices(dataStreams[0]) && (
            <>
              <MixedIndicesCallout
                history={history}
                ilmPolicyLink={ilmPolicyLink}
                ilmPolicyName={ilmPolicyName}
                dataStreamName={dataStreamNames[0]}
              />
              <EuiSpacer />
            </>
          )}

          {enableProjectLevelRetentionChecks && !isBulkEdit && lifecycle?.globalMaxRetention && (
            <>
              <FormattedMessage
                id="xpack.idxMgmt.dataStreams.editDataRetentionModal.modalTitleText"
                defaultMessage="Maximum data retention period is {maxRetention} {unitText}"
                values={{
                  maxRetention: globalMaxRetention.size,
                  unitText: globalMaxRetention.unitText,
                }}
              />
              <EuiSpacer />
            </>
          )}

          {enableTogglingDataRetention && (
            <UseField
              path="dataRetentionEnabled"
              component={ToggleField}
              data-test-subj="dataRetentionEnabledField"
            />
          )}

          <UseField
            path="dataRetention"
            component={NumericField}
            validationData={{
              globalMaxRetention: lifecycle?.globalMaxRetention,
              enableProjectLevelRetentionChecks,
            }}
            labelAppend={
              <EuiText size="xs">
                <EuiLink href={documentationService.getUpdateExistingDS()} target="_blank" external>
                  {i18n.translate(
                    'xpack.idxMgmt.dataStreams.editDataRetentionModal.learnMoreLinkText',
                    {
                      defaultMessage: 'How does this work?',
                    }
                  )}
                </EuiLink>
              </EuiText>
            }
            helpText={
              isBulkEdit &&
              lifecycle?.globalMaxRetention && (
                <FormattedMessage
                  id="xpack.idxMgmt.dataStreams.editDataRetentionModal.learnMoreLinkText"
                  defaultMessage="Maximum data retention period for this project is {maxRetention} {unitText}. {manageSettingsLink}"
                  values={{
                    maxRetention: globalMaxRetention.size,
                    unitText: globalMaxRetention.unitText,
                    manageSettingsLink: (
                      <EuiLink href={cloud?.deploymentUrl} target="_blank">
                        {i18n.translate(
                          'xpack.idxMgmt.dataStreams.editDataRetentionModal.manageProjectSettingsLinkText',
                          {
                            defaultMessage: 'Manage project settings.',
                          }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              )
            }
            componentProps={{
              fullWidth: true,
              euiFieldProps: {
                disabled:
                  formData.infiniteRetentionPeriod ||
                  (!formData.dataRetentionEnabled && enableTogglingDataRetention),
                'data-test-subj': `dataRetentionValue`,
                min: 1,
                append: (
                  <UnitField
                    path="timeUnit"
                    options={timeUnits}
                    disabled={
                      formData.infiniteRetentionPeriod ||
                      (!formData.dataRetentionEnabled && enableTogglingDataRetention)
                    }
                    euiFieldProps={{
                      'data-test-subj': 'timeUnit',
                      'aria-label': i18n.translate(
                        'xpack.idxMgmt.dataStreams.editDataRetentionModal.unitsAriaLabel',
                        {
                          defaultMessage: 'Time unit',
                        }
                      ),
                    }}
                  />
                ),
              },
            }}
          />

          <UseField
            path="infiniteRetentionPeriod"
            component={ToggleField}
            data-test-subj="infiniteRetentionPeriod"
            label={i18n.translate(
              'xpack.idxMgmt.dataStreams.editDataRetentionModal.infiniteRetentionPeriodField',
              {
                defaultMessage:
                  'Keep data {withProjectLevelRetention, plural, one {up to maximum retention period} other {indefinitely}}',
                values: { withProjectLevelRetention: enableProjectLevelRetentionChecks ? 1 : 0 },
              }
            )}
            componentProps={{
              euiFieldProps: {
                disabled: !formData.dataRetentionEnabled && enableTogglingDataRetention,
              },
            }}
          />

          <EuiSpacer />

          {affectedDataStreams.length > 0 && !formData.infiniteRetentionPeriod && (
            <EuiCallOut
              title={i18n.translate(
                'xpack.idxMgmt.dataStreams.editDataRetentionModal.affectedDataStreamsCalloutTitle',
                {
                  defaultMessage: 'Some data will be deleted',
                }
              )}
              color="danger"
              iconType="warning"
              data-test-subj="reducedDataRetentionCallout"
            >
              <p>
                {isBulkEdit ? (
                  <FormattedMessage
                    id="xpack.idxMgmt.dataStreams.editDataRetentionModal.bulkEdit.affectedDataStreamsCalloutText"
                    defaultMessage="The retention period will be reduced for {affectedDataStreamCount} {affectedDataStreamCount, plural, one {data stream} other {data streams}}. Data older than then new
                retention period will be permanently deleted."
                    values={{
                      affectedDataStreamCount: affectedDataStreams.length,
                    }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.idxMgmt.dataStreams.editDataRetentionModal.singleEdit.affectedDataStreamsSingleCalloutText"
                    defaultMessage="The retention period will be reduced. Data older than then new retention period will be permanently deleted."
                  />
                )}
              </p>
              {isBulkEdit && affectedDataStreams.length <= 10 && (
                <p>
                  <FormattedMessage
                    id="xpack.idxMgmt.dataStreams.editDataRetentionModal.affectedDataStreamsCalloutList"
                    defaultMessage="Affected data streams: {affectedDataStreams}"
                    values={{
                      affectedDataStreams: <b>{affectedDataStreams.join(', ')}</b>,
                    }}
                  />
                </p>
              )}
            </EuiCallOut>
          )}
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty data-test-subj="cancelButton" onClick={() => onClose()}>
            <FormattedMessage
              id="xpack.idxMgmt.dataStreams.editDataRetentionModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            fill
            type="submit"
            isLoading={false}
            disabled={disableSubmit}
            data-test-subj="saveButton"
            onClick={onSubmitForm}
          >
            <FormattedMessage
              id="xpack.idxMgmt.dataStreams.editDataRetentionModal.saveButtonLabel"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiModalFooter>
      </Form>
    </EuiModal>
  );
};
