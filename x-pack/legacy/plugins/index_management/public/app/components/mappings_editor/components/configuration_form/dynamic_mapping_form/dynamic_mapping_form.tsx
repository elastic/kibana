/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink } from '@elastic/eui';

import { documentationService } from '../../../../../services/documentation';
import {
  useForm,
  getUseField,
  Form,
  FormDataProvider,
  FormRow,
  Field,
} from '../../../shared_imports';
import { DYNAMIC_SETTING_OPTIONS, ALL_DATE_FORMAT_OPTIONS } from '../../../constants';
import { Types, useDispatch } from '../../../mappings_state';
import { dynamicMappingSchema } from './dynamic_mapping_schema';

type MappingsConfiguration = Types['MappingsConfiguration'];

interface Props {
  defaultValue?: MappingsConfiguration;
}

const UseField = getUseField({ component: Field });

export const DynamicMappingForm = React.memo(({ defaultValue }: Props) => {
  const { form } = useForm<MappingsConfiguration>({ schema: dynamicMappingSchema, defaultValue });
  const dispatch = useDispatch();

  useEffect(() => {
    const subscription = form.subscribe(updatedConfiguration => {
      dispatch({ type: 'configuration.update', value: updatedConfiguration });
    });
    return subscription.unsubscribe;
  }, [form]);

  return (
    <Form form={form}>
      <FormRow
        title={i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicMappingTitle', {
          defaultMessage: 'Dynamic mapping',
        })}
        description={
          <FormattedMessage
            id="xpack.idxMgmt.mappingsEditor.dynamicMappingDescription"
            defaultMessage="The dynamic mapping rules to apply at the document level. {docsLink}"
            values={{
              docsLink: (
                <EuiLink href={documentationService.getDynamicMappingLink()} target="_blank">
                  {i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicMappingDocumentionLink', {
                    defaultMessage: 'Learn more.',
                  })}
                </EuiLink>
              ),
            }}
          />
        }
      >
        <UseField
          path="dynamic"
          componentProps={{
            euiFieldProps: { options: DYNAMIC_SETTING_OPTIONS },
          }}
        />
        <UseField path="numeric_detection" />
        <UseField path="date_detection" />
        <FormDataProvider pathsToWatch="date_detection">
          {formData => {
            if (formData.date_detection) {
              return (
                <UseField
                  path="dynamic_date_formats"
                  componentProps={{
                    euiFieldProps: {
                      options: ALL_DATE_FORMAT_OPTIONS,
                      noSuggestions: false,
                    },
                  }}
                />
              );
            }
            return null;
          }}
        </FormDataProvider>
      </FormRow>
    </Form>
  );
});
