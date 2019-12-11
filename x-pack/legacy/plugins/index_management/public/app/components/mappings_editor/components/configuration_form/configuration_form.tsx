/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink } from '@elastic/eui';

import {
  useForm,
  getUseField,
  Form,
  OnFormUpdateArg,
  FormDataProvider,
} from '../../shared_imports';
import { FormRow, Field } from '../../shared_imports';
import { DYNAMIC_SETTING_OPTIONS, ALL_DATE_FORMAT_OPTIONS } from '../../constants';
import { Types, useDispatch } from '../../mappings_state';
import { schema } from './form.schema';
import { documentationService } from '../../../../services/documentation';

type MappingsConfiguration = Types['MappingsConfiguration'];

export type ConfigurationUpdateHandler = (arg: OnFormUpdateArg<MappingsConfiguration>) => void;

interface Props {
  defaultValue?: MappingsConfiguration;
}

const UseField = getUseField({ component: Field });

export const ConfigurationForm = React.memo(({ defaultValue }: Props) => {
  const { form } = useForm<MappingsConfiguration>({ schema, defaultValue });
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
        title={i18n.translate('xpack.idxMgmt.mappingsEditor.configurationTitle', {
          defaultMessage: 'Configuration',
        })}
        description={
          <FormattedMessage
            id="xpack.idxMgmt.mappingsEditor.configurationDescription"
            defaultMessage="The dynamic mapping rules to apply at the document level. {docsLink}"
            values={{
              docsLink: (
                <EuiLink
                  href={documentationService.getTypeDocLink('dynamic', 'main')}
                  target="_blank"
                >
                  {i18n.translate('xpack.idxMgmt.mappingsEditor.configurationDocumentionLink', {
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
