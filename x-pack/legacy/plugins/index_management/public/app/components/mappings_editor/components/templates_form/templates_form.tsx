/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiText, EuiLink, EuiSpacer } from '@elastic/eui';
import { useForm, Form, SerializerFunc, UseField, JsonEditorField } from '../../shared_imports';
import { Types, useDispatch } from '../../mappings_state';
import { templatesFormSchema } from './templates_form_schema';
import { documentationService } from '../../../../services/documentation';

type MappingsTemplates = Types['MappingsTemplates'];

interface Props {
  defaultValue?: MappingsTemplates;
}

const stringifyJson = (json: { [key: string]: any }) =>
  Array.isArray(json) ? JSON.stringify(json, null, 2) : '[\n\n]';

const formSerializer: SerializerFunc<MappingsTemplates> = formData => {
  const { dynamicTemplates } = formData;

  let parsedTemplates;
  try {
    parsedTemplates = JSON.parse(dynamicTemplates);

    if (!Array.isArray(parsedTemplates)) {
      // User provided an object, but we need an array of objects
      parsedTemplates = [parsedTemplates];
    }
  } catch {
    parsedTemplates = [];
  }

  return {
    dynamic_templates: parsedTemplates,
  };
};

const formDeserializer = (formData: { [key: string]: any }) => {
  const { dynamic_templates } = formData;

  return {
    dynamicTemplates: stringifyJson(dynamic_templates),
  };
};

export const TemplatesForm = React.memo(({ defaultValue }: Props) => {
  const didMountRef = useRef(false);

  const { form } = useForm<MappingsTemplates>({
    schema: templatesFormSchema,
    serializer: formSerializer,
    deserializer: formDeserializer,
    defaultValue,
  });
  const dispatch = useDispatch();

  useEffect(() => {
    const subscription = form.subscribe(({ data, isValid, validate }) => {
      dispatch({
        type: 'templates.update',
        value: { data, isValid, validate, submitForm: form.submit },
      });
    });
    return subscription.unsubscribe;
  }, [form]);

  useEffect(() => {
    if (didMountRef.current) {
      // If the defaultValue has changed (it probably means that we have loaded a new JSON)
      // we need to reset the form to update the fields values.
      form.reset({ resetValues: true });
    } else {
      // Avoid reseting the form on component mount.
      didMountRef.current = true;
    }
  }, [defaultValue]);

  useEffect(() => {
    return () => {
      // On unmount => save in the state a snapshot of the current form data.
      dispatch({ type: 'templates.save' });
    };
  }, []);

  return (
    <>
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dynamicTemplatesDescription"
          defaultMessage="Use dynamic templates to define custom mappings that can be applied to dynamically added fields. {docsLink}"
          values={{
            docsLink: (
              <EuiLink href={documentationService.getDynamicTemplatesLink()} target="_blank">
                {i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicTemplatesDocumentationLink', {
                  defaultMessage: 'Learn more.',
                })}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <Form form={form} isInvalid={form.isSubmitted && !form.isValid} error={form.getErrors()}>
        <UseField
          path="dynamicTemplates"
          component={JsonEditorField}
          componentProps={{
            euiCodeEditorProps: {
              height: '600px',
              'aria-label': i18n.translate(
                'xpack.idxMgmt.mappingsEditor.dynamicTemplatesEditorAriaLabel',
                {
                  defaultMessage: 'Dynamic templates editor',
                }
              ),
            },
          }}
        />
      </Form>
    </>
  );
});
