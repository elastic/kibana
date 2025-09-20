/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { schema } from './schema';
import { usePostCase } from '../../containers/use_post_case';
import { usePostPushToService } from '../../containers/use_post_push_to_service';

import type { CasesConfigurationUI, CaseUI } from '../../containers/types';
import type { CasePostRequest, ObservablePost } from '../../../common/types/api';
import type { UseCreateAttachments } from '../../containers/use_create_attachments';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import type { CaseAttachmentsWithoutOwner } from '../../types';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { useCreateCaseWithAttachmentsTransaction } from '../../common/apm/use_cases_transactions';
import { useApplication } from '../../common/lib/kibana/use_application';
import { createFormSerializer, createFormDeserializer, getInitialCaseValue } from './utils';
import type { CaseFormFieldsSchemaProps } from '../case_form_fields/schema';
import { useBulkPostObservables } from '../../containers/use_bulk_post_observables';

interface Props {
  afterCaseCreated?: (
    theCase: CaseUI,
    createAttachments: UseCreateAttachments['mutateAsync']
  ) => Promise<void>;
  children?: JSX.Element | JSX.Element[];
  onSuccess?: (theCase: CaseUI) => void;
  attachments?: CaseAttachmentsWithoutOwner;
  initialValue?: Pick<CasePostRequest, 'title' | 'description'>;
  currentConfiguration: CasesConfigurationUI;
  selectedOwner: string;
  observables?: ObservablePost[];
}

export const FormContext: React.FC<Props> = ({
  afterCaseCreated,
  children,
  onSuccess,
  attachments,
  initialValue,
  currentConfiguration,
  selectedOwner,
  observables,
}) => {
  const { appId } = useApplication();
  const { data: connectors = [] } = useGetSupportedActionConnectors();
  const { mutateAsync: postCase } = usePostCase();
  const { mutateAsync: createAttachments } = useCreateAttachments();
  const { mutateAsync: bulkPostObservables } = useBulkPostObservables();
  const { mutateAsync: pushCaseToExternalService } = usePostPushToService();
  const { startTransaction } = useCreateCaseWithAttachmentsTransaction();

  const submitCase = useCallback(
    async (data: CasePostRequest, isValid: boolean) => {
      if (isValid) {
        startTransaction({ appId, attachments });

        const theCase = await postCase({
          request: data,
        });

        // add attachments to the case
        if (theCase && Array.isArray(attachments) && attachments.length > 0) {
          await createAttachments({
            caseId: theCase.id,
            caseOwner: theCase.owner,
            attachments,
          });
        }

        if (theCase && Array.isArray(observables) && observables.length > 0) {
          if (data.settings.extractObservables) {
            await bulkPostObservables({ caseId: theCase.id, observables });
          }
        }

        if (afterCaseCreated && theCase) {
          await afterCaseCreated(theCase, createAttachments);
        }

        if (theCase?.id && data.connector.id !== 'none') {
          await pushCaseToExternalService({
            caseId: theCase.id,
            connector: data.connector,
          });
        }

        if (onSuccess && theCase) {
          onSuccess(theCase);
        }
      }
    },
    [
      startTransaction,
      appId,
      attachments,
      postCase,
      afterCaseCreated,
      onSuccess,
      createAttachments,
      pushCaseToExternalService,
      observables,
      bulkPostObservables,
    ]
  );

  const { form } = useForm({
    defaultValue: {
      /**
       * This is needed to initiate the connector
       * with the one set in the configuration
       * when creating a case.
       */
      ...getInitialCaseValue({
        owner: selectedOwner,
        connector: currentConfiguration.connector,
      }),
      ...initialValue,
    },
    options: { stripEmptyFields: false },
    schema,
    onSubmit: submitCase,
    serializer: (data: CaseFormFieldsSchemaProps) =>
      createFormSerializer(
        connectors,
        {
          ...currentConfiguration,
          owner: selectedOwner,
        },
        data
      ),
    deserializer: createFormDeserializer,
  });

  return (
    <Form
      onKeyDown={(e: KeyboardEvent) => {
        // It avoids the focus scaping from the flyout when enter is pressed.
        // https://github.com/elastic/kibana/issues/111120
        if (e.key === 'Enter') {
          e.stopPropagation();
        }
      }}
      form={form}
    >
      {children}
    </Form>
  );
};

FormContext.displayName = 'FormContext';
