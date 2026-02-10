/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryObj } from '@storybook/react';
import { z } from '@kbn/zod/v4';
import { EuiButton } from '@elastic/eui';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { generateFormFields } from './form';

interface StoryArgs {
  disabled?: boolean;
}

const meta = {
  title: 'Form Field Generator',
  args: {
    disabled: false,
  },
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether the form fields are in read-only mode',
    },
  },
};

export default meta;

const submit = ({ data }: { data: unknown }) => {
  // eslint-disable-next-line no-console
  console.log(data);
  window.alert(JSON.stringify(data, null, 2));
};

interface FormWrapperProps {
  schema: z.ZodObject<z.ZodRawShape>;
  onSubmit: (data: { data: unknown }) => void;
  disabled?: boolean;
}

const FormWrapper = ({ schema, onSubmit, disabled = false }: FormWrapperProps) => {
  const { form } = useForm({
    onSubmit: async (data, isValid) => {
      if (isValid) {
        onSubmit({ data });
      }
    },
  });

  return (
    <Form form={form}>
      {generateFormFields({ schema, formConfig: { disabled } })}
      <EuiButton onClick={form.submit} isLoading={form.isSubmitting}>
        Submit
      </EuiButton>
    </Form>
  );
};

export const WebhookConnector: StoryObj<StoryArgs> = {
  render: (args) => {
    return (
      <FormWrapper schema={webhookConnectorFormSchema} onSubmit={submit} disabled={args.disabled} />
    );
  },
};

export const AbuseIPDBConnector: StoryObj<StoryArgs> = {
  render: (args) => {
    return (
      <FormWrapper schema={abuseIPDBConnectorSchema} onSubmit={submit} disabled={args.disabled} />
    );
  },
};

export const AlienVaultOTXConnector: StoryObj<StoryArgs> = {
  render: (args) => {
    return (
      <FormWrapper
        schema={alienVaultOTXConnectorSchema}
        onSubmit={submit}
        disabled={args.disabled}
      />
    );
  },
};

export const GreyNoiseConnector: StoryObj<StoryArgs> = {
  render: (args) => {
    return (
      <FormWrapper schema={GreyNoiseConnectorSchema} onSubmit={submit} disabled={args.disabled} />
    );
  },
};

export const ShodanConnector: StoryObj<StoryArgs> = {
  render: (args) => {
    return (
      <FormWrapper schema={ShodanConnectorSchema} onSubmit={submit} disabled={args.disabled} />
    );
  },
};

export const UrlVoidConnector: StoryObj<StoryArgs> = {
  render: (args) => {
    return (
      <FormWrapper schema={UrlVoidConnectorSchema} onSubmit={submit} disabled={args.disabled} />
    );
  },
};

export const VirusTotalConnector: StoryObj<StoryArgs> = {
  render: (args) => {
    return (
      <FormWrapper schema={VirusTotalConnectorSchema} onSubmit={submit} disabled={args.disabled} />
    );
  },
};

export const NestedObjectExample: StoryObj<StoryArgs> = {
  render: (args) => {
    return <FormWrapper schema={NestedObjectSchema} onSubmit={submit} disabled={args.disabled} />;
  },
};

const webhookConnectorFormSchema = z.object({
  config: z.object({
    method: z
      .enum(['POST', 'PUT', 'GET', 'DELETE'])
      .meta({
        label: 'Method',
      })
      .default('GET'),
    url: z.url().meta({ label: 'URL', placeholder: 'https://...' }),
  }),
  secrets: z
    .discriminatedUnion('authType', [
      z.object({ authType: z.literal('none') }).meta({
        label: 'None',
      }),
      z
        .object({
          authType: z.literal('basic'),
          username: z.string().min(1, { message: 'Username cannot be empty' }).meta({
            label: 'Username',
          }),
          password: z.string().min(1, { message: 'Password cannot be empty' }).meta({
            label: 'Password',
            sensitive: true,
          }),
        })
        .meta({ label: 'Basic Authentication' }),
      z
        .object({
          authType: z.literal('bearer'),
          token: z.string().min(1, { message: 'Token cannot be empty' }).meta({
            label: 'Token',
          }),
        })
        .meta({ label: 'Bearer Token' }),
    ])
    .meta({
      label: 'Authentication',
    })
    .default({ authType: 'basic', username: '', password: '' }),
});

const abuseIPDBConnectorSchema = z.object({
  secrets: z.discriminatedUnion('authType', [
    z
      .object({
        authType: z.literal('api_key_header'),
        Key: z.string().min(1, { message: 'API Key cannot be empty' }).meta({
          label: 'API Key',
          placeholder: 'Your AbuseIPDB API Key',
          sensitive: true,
        }),
      })
      .meta({
        label: 'Headers',
      }),
  ]),
});

const alienVaultOTXConnectorSchema = z.object({
  secrets: z.discriminatedUnion('authType', [
    z.object({
      authType: z.literal('api_key_header'),
      'X-OTX-API-KEY': z.string().min(1, { message: 'API Key cannot be empty' }).meta({
        label: 'API Key',
        sensitive: true,
        placeholder: 'Your AlienVault OTX API Key',
      }),
    }),
  ]),
});

const GreyNoiseConnectorSchema = z.object({
  secrets: z.discriminatedUnion('authType', [
    z
      .object({
        authType: z.literal('api_key_header'),
        key: z.string().min(1, { message: 'API Key cannot be empty' }).meta({
          widget: 'password',
          label: 'API Key',
        }),
      })
      .meta({
        label: 'Headers',
      }),
  ]),
});

const ShodanConnectorSchema = z.object({
  secrets: z.discriminatedUnion('authType', [
    z
      .object({
        authType: z.literal('api_key_header'),
        'X-Api-Key': z.string().min(1, { message: 'API Key cannot be empty' }).meta({
          widget: 'password',
          label: 'API Key',
        }),
      })
      .meta({
        label: 'Headers',
      }),
  ]),
});

const UrlVoidConnectorSchema = z.object({
  secrets: z.discriminatedUnion('authType', [
    z
      .object({
        authType: z.literal('api_key_header'),
        'X-Api-Key': z.string().min(1, { message: 'API Key cannot be empty' }).meta({
          widget: 'password',
          label: 'API Key',
        }),
      })
      .meta({
        label: 'Headers',
      }),
  ]),
});

const VirusTotalConnectorSchema = z.object({
  secrets: z
    .discriminatedUnion('authType', [
      z
        .object({
          authType: z.literal('api_key_header'),
          'x-apikey': z.string().min(1, { message: 'API Key cannot be empty' }).meta({
            widget: 'password',
            label: 'API Key',
            placeholder: 'vt-...',
          }),
        })
        .meta({
          label: 'Headers',
        }),
    ])
    .meta({ widget: 'formFieldset', label: 'Authentication' }),
});

const NestedObjectSchema = z.object({
  name: z.string().meta({
    label: 'Application Name',
    placeholder: 'My Application',
  }),
  server: z.object({
    host: z.string().meta({
      label: 'Server Host',
      placeholder: 'localhost',
      helpText: 'The hostname or IP address of the server',
    }),
    port: z.string().meta({
      label: 'Server Port',
      placeholder: '8080',
      helpText: 'The port number to connect to',
    }),
  }),
  database: z.object({
    host: z.string().meta({
      label: 'Database Host',
      placeholder: 'db.example.com',
    }),
    port: z.string().meta({
      label: 'Database Port',
      placeholder: '5432',
    }),
    name: z.string().meta({
      label: 'Database Name',
      placeholder: 'mydb',
    }),
    credentials: z.object({
      username: z.string().min(1, { message: 'Username is required' }).meta({
        label: 'Username',
        placeholder: 'dbuser',
      }),
      password: z.string().min(1, { message: 'Password is required' }).meta({
        label: 'Password',
        sensitive: true,
      }),
    }),
  }),
});
