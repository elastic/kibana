/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import EmailActionConnectorFields from './email_connector';
import type { AppMockRenderer } from '../lib/test_utils';
import { ConnectorFormTestProvider, createAppMockRenderer } from '../lib/test_utils';
import { AdditionalEmailServices } from '../../../common';
import { getServiceConfig } from './api';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

jest.mock('./api', () => {
  return {
    getServiceConfig: jest.fn(),
  };
});

describe('EmailActionConnectorFields', () => {
  const enabledEmailServices = ['*'];
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('all connector fields are rendered', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
        service: 'other',
      },
      isDeprecated: false,
    };

    appMockRenderer.render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    const emailFromInput = await screen.findByTestId('emailFromInput');
    expect(emailFromInput).toBeInTheDocument();
    expect(emailFromInput).toHaveValue('test@test.com');

    const emailServiceSelectInput = await screen.findByTestId('emailServiceSelectInput');
    expect(emailServiceSelectInput).toBeInTheDocument();

    const emailHostInput = await screen.findByTestId('emailHostInput');
    expect(emailHostInput).toBeInTheDocument();

    const emailPortInput = await screen.findByTestId('emailPortInput');
    expect(emailPortInput).toBeInTheDocument();

    const emailUserInput = await screen.findByTestId('emailUserInput');
    expect(emailUserInput).toBeInTheDocument();

    const emailPasswordInput = await screen.findByTestId('emailPasswordInput');
    expect(emailPasswordInput).toBeInTheDocument();
  });

  it('secret connector fields are not rendered when hasAuth false', async () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: false,
        service: 'other',
      },
      isDeprecated: false,
    };

    appMockRenderer.render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    const emailFromInput = await screen.findByTestId('emailFromInput');
    expect(emailFromInput).toBeInTheDocument();
    expect(emailFromInput).toHaveValue('test@test.com');

    const emailHostInput = await screen.findByTestId('emailHostInput');
    expect(emailHostInput).toBeInTheDocument();

    const emailPortInput = await screen.findByTestId('emailPortInput');
    expect(emailPortInput).toBeInTheDocument();

    expect(screen.queryByTestId('emailUserInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('emailPasswordInput')).not.toBeInTheDocument();
  });

  it('service field defaults to other when not defined', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
      },
      isDeprecated: false,
    };

    appMockRenderer.render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    const emailServiceSelectInput = await screen.findByTestId('emailServiceSelectInput');
    expect(emailServiceSelectInput).toBeInTheDocument();
    expect(emailServiceSelectInput).toHaveValue('other');
  });

  it('service field are correctly selected when defined', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
        service: 'gmail',
      },
      isDeprecated: false,
    };

    appMockRenderer.render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    const emailServiceSelectInput = await screen.findByTestId('emailServiceSelectInput');
    expect(emailServiceSelectInput).toBeInTheDocument();
    expect(emailServiceSelectInput).toHaveValue('gmail');
  });

  it('host, port and secure fields should be disabled when service field is set to well known service', async () => {
    (getServiceConfig as jest.Mock).mockResolvedValue({
      host: 'https://example.com',
      port: 80,
      secure: false,
    });

    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
        service: 'gmail',
      },
      isDeprecated: false,
    };

    appMockRenderer.render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    const emailHostInput = await screen.findByTestId('emailHostInput');
    expect(emailHostInput).toBeDisabled();

    const emailPortInput = await screen.findByTestId('emailPortInput');
    expect(emailPortInput).toBeDisabled();

    const emailSecureSwitch = await screen.findByTestId('emailSecureSwitch');
    expect(emailSecureSwitch).toBeDisabled();
  });

  it('host, port and secure fields should not be disabled when service field is set to other', async () => {
    (getServiceConfig as jest.Mock).mockResolvedValue({
      host: 'https://example.com',
      port: 80,
      secure: false,
    });

    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
        service: 'other',
      },
      isDeprecated: false,
    };

    appMockRenderer.render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    const emailHostInput = await screen.findByTestId('emailHostInput');
    expect(emailHostInput).not.toBeDisabled();

    const emailPortInput = await screen.findByTestId('emailPortInput');
    expect(emailPortInput).not.toBeDisabled();

    const emailSecureSwitch = await screen.findByTestId('emailSecureSwitch');
    expect(emailSecureSwitch).not.toBeDisabled();
  });

  it.each([[null], [''], [AdditionalEmailServices.EXCHANGE]])(
    'should not show the host, port, and secure fields when service field is %s',
    async (service) => {
      const actionConnector = {
        secrets: {
          user: 'user',
          password: 'pass',
        },
        id: 'test',
        actionTypeId: '.email',
        name: 'email',
        config: {
          from: 'test@test.com',
          hasAuth: true,
          service,
        },
        isDeprecated: false,
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider connector={actionConnector}>
          <EmailActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      expect(screen.queryByTestId('emailHostInput')).not.toBeInTheDocument();
      expect(screen.queryByTestId('emailPortInput')).not.toBeInTheDocument();
      expect(screen.queryByTestId('emailSecureSwitch')).not.toBeInTheDocument();
    }
  );

  describe('Validation', () => {
    const onSubmit = jest.fn();
    const validateEmailAddresses = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      appMockRenderer = createAppMockRenderer();
      validateEmailAddresses.mockReturnValue([{ valid: true }]);
    });

    it('submits the connector', async () => {
      const actionConnector = {
        secrets: {
          user: 'user',
          password: 'pass',
          clientSecret: null,
        },
        id: 'test',
        actionTypeId: '.email',
        name: 'email',
        config: {
          from: 'test@test.com',
          port: 2323,
          host: 'localhost',
          test: 'test',
          hasAuth: true,
          service: 'other',
        },
        isDeprecated: false,
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          connectorServices={{ validateEmailAddresses, enabledEmailServices }}
        >
          <EmailActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      const submitButton = await screen.findByTestId('form-test-provide-submit');
      await userEvent.click(submitButton);

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.email',
          config: {
            from: 'test@test.com',
            hasAuth: true,
            host: 'localhost',
            port: 2323,
            secure: false,
            service: 'other',
          },
          id: 'test',
          isDeprecated: false,
          name: 'email',
          secrets: {
            user: 'user',
            password: 'pass',
          },
        },
        isValid: true,
      });
    });

    it('submits the connector with auth false', async () => {
      const actionConnector = {
        secrets: {
          user: null,
          password: null,
          clientSecret: null,
        },
        id: 'test',
        actionTypeId: '.email',
        name: 'email',
        config: {
          from: 'test@test.com',
          port: 2323,
          host: 'localhost',
          test: 'test',
          hasAuth: false,
          service: 'other',
        },
        isDeprecated: false,
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          connectorServices={{ validateEmailAddresses, enabledEmailServices }}
        >
          <EmailActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      const submitButton = await screen.findByTestId('form-test-provide-submit');
      await userEvent.click(submitButton);

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.email',
          config: {
            from: 'test@test.com',
            port: 2323,
            host: 'localhost',
            hasAuth: false,
            service: 'other',
            secure: false,
          },
          id: 'test',
          isDeprecated: false,
          name: 'email',
        },
        isValid: true,
      });
    });

    it('submits the connector with a service correctly', async () => {
      (getServiceConfig as jest.Mock).mockResolvedValue({
        host: 'https://example.com',
        port: 80,
        secure: false,
      });

      const actionConnector = {
        secrets: {
          user: 'user',
          password: 'pass',
        },
        id: 'test',
        actionTypeId: '.email',
        name: 'email',
        config: {
          from: 'test@test.com',
          hasAuth: true,
          service: 'gmail',
        },
        isDeprecated: false,
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          connectorServices={{ validateEmailAddresses, enabledEmailServices }}
        >
          <EmailActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      const submitButton = await screen.findByTestId('form-test-provide-submit');
      await userEvent.click(submitButton);

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.email',
          config: {
            from: 'test@test.com',
            hasAuth: true,
            host: 'https://example.com',
            port: 80,
            secure: false,
            service: 'gmail',
          },
          id: 'test',
          isDeprecated: false,
          name: 'email',
          secrets: {
            user: 'user',
            password: 'pass',
          },
        },
        isValid: true,
      });
    });

    it('connector validation fails when connector config is not valid', async () => {
      useKibanaMock().services.actions.validateEmailAddresses = jest
        .fn()
        .mockReturnValue([{ valid: false }]);
      const actionConnector = {
        secrets: {
          user: 'user',
          password: 'pass',
        },
        id: 'test',
        actionTypeId: '.email',
        name: 'email',
        config: {
          from: 'test@notallowed.com',
          hasAuth: true,
          service: 'other',
        },
        isDeprecated: false,
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          connectorServices={{ validateEmailAddresses, enabledEmailServices }}
        >
          <EmailActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      const submitButton = await screen.findByTestId('form-test-provide-submit');
      await userEvent.click(submitButton);

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });

    it('connector validation fails when user specified but not password', async () => {
      const actionConnector = {
        secrets: {
          user: 'user',
          password: '',
          clientSecret: null,
        },
        id: 'test',
        actionTypeId: '.email',
        isPreconfigured: false,
        isDeprecated: false,
        name: 'email',
        config: {
          from: 'test@test.com',
          port: 2323,
          host: 'localhost',
          test: 'test',
          hasAuth: true,
          service: 'other',
        },
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          connectorServices={{ validateEmailAddresses, enabledEmailServices }}
        >
          <EmailActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      const submitButton = await screen.findByTestId('form-test-provide-submit');
      await userEvent.click(submitButton);

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });

    it('connector validation fails when exchange service is selected, but clientId, tenantId and clientSecrets were not defined', async () => {
      const actionConnector = {
        secrets: {
          user: 'user',
          password: 'pass',
          clientSecret: null,
        },
        id: 'test',
        actionTypeId: '.email',
        name: 'email',
        isPreconfigured: false,
        isDeprecated: false,
        config: {
          from: 'test@test.com',
          hasAuth: true,
          service: 'exchange_server',
        },
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          connectorServices={{ validateEmailAddresses, enabledEmailServices }}
        >
          <Suspense fallback={null}>
            <EmailActionConnectorFields
              readOnly={false}
              isEdit={false}
              registerPreSubmitValidator={() => {}}
            />
          </Suspense>
        </ConnectorFormTestProvider>
      );

      const submitButton = await screen.findByTestId('form-test-provide-submit');
      await userEvent.click(submitButton);

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });

    it.each([[123.5], ['123.5']])(
      'connector validation fails when port is not an integer: %p',
      async (port) => {
        const actionConnector = {
          secrets: {
            user: 'user',
            password: 'pass',
          },
          id: 'test',
          actionTypeId: '.email',
          name: 'email',
          config: {
            from: 'test@notallowed.com',
            hasAuth: true,
            service: 'other',
            host: 'my-host',
            port,
          },
          isDeprecated: false,
        };

        const { getByTestId } = appMockRenderer.render(
          <ConnectorFormTestProvider
            connector={actionConnector}
            onSubmit={onSubmit}
            connectorServices={{ validateEmailAddresses, enabledEmailServices }}
          >
            <EmailActionConnectorFields
              readOnly={false}
              isEdit={false}
              registerPreSubmitValidator={() => {}}
            />
          </ConnectorFormTestProvider>
        );

        await userEvent.click(getByTestId('form-test-provide-submit'));

        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
        });
      }
    );

    it.each([[123], ['123']])('connector validation pass when port is valid: %p', async (port) => {
      const actionConnector = {
        secrets: {
          user: 'user',
          password: 'pass',
        },
        id: 'test',
        actionTypeId: '.email',
        name: 'email',
        config: {
          from: 'test@notallowed.com',
          hasAuth: true,
          service: 'other',
          host: 'my-host',
          port,
        },
        isDeprecated: false,
      };

      appMockRenderer.render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          connectorServices={{ validateEmailAddresses, enabledEmailServices }}
        >
          <EmailActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      const submitButton = await screen.findByTestId('form-test-provide-submit');
      await userEvent.click(submitButton);

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.email',
          config: {
            from: 'test@notallowed.com',
            hasAuth: true,
            host: 'my-host',
            port,
            secure: false,
            service: 'other',
          },
          id: 'test',
          isDeprecated: false,
          name: 'email',
          secrets: {
            password: 'pass',
            user: 'user',
          },
        },
        isValid: true,
      });
    });
  });
});

describe('when not all email services are enabled', () => {
  const enabledEmailServices = ['amazon-ses', 'other', 'microsoft-exchange'];
  let appMockRenderer: AppMockRenderer;
  const onSubmit = jest.fn();
  const validateEmailAddresses = jest.fn();

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
    validateEmailAddresses.mockReturnValue([{ valid: true }]);
    (getServiceConfig as jest.Mock).mockResolvedValue({
      host: 'https://example.com',
      port: 2255,
      secure: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('only allows enabled services to be selected only', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {},
      isDeprecated: false,
    };

    appMockRenderer.render(
      <ConnectorFormTestProvider
        connector={actionConnector}
        onSubmit={onSubmit}
        connectorServices={{ validateEmailAddresses, enabledEmailServices }}
      >
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    const emailServiceSelect = (await screen.findByTestId(
      'emailServiceSelectInput'
    )) as HTMLSelectElement;

    const options = within(emailServiceSelect).getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toBe('Amazon SES');
    expect(options[1].textContent).toBe('MS Exchange Server');
    expect(options[2].textContent).toBe('Other');
  });

  it('adds the current connector service to the service list even if not enabled', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        test: 'test',
        service: 'gmail', // not enabled
        secure: true,
      },
      isDeprecated: false,
    };

    appMockRenderer.render(
      <ConnectorFormTestProvider
        connector={actionConnector}
        onSubmit={onSubmit}
        connectorServices={{ validateEmailAddresses, enabledEmailServices }}
      >
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    const emailServiceSelect = (await screen.findByTestId(
      'emailServiceSelectInput'
    )) as HTMLSelectElement;

    const options = within(emailServiceSelect).getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options[0].textContent).toBe('Gmail');
    expect(options[1].textContent).toBe('Amazon SES');
    expect(options[2].textContent).toBe('MS Exchange Server');
    expect(options[3].textContent).toBe('Other');
  });

  it('sets the service to other if the enabled services contain *', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
      },
      isDeprecated: false,
    };

    appMockRenderer.render(
      <ConnectorFormTestProvider
        connector={actionConnector}
        connectorServices={{ validateEmailAddresses, enabledEmailServices: ['google-mail', '*'] }}
      >
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    const emailServiceSelectInput = await screen.findByTestId('emailServiceSelectInput');
    expect(emailServiceSelectInput).toBeInTheDocument();
    expect(emailServiceSelectInput).toHaveValue('other');
  });

  it('sets the service to the first available', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
      },
      isDeprecated: false,
    };

    appMockRenderer.render(
      <ConnectorFormTestProvider
        connector={actionConnector}
        connectorServices={{
          validateEmailAddresses,
          enabledEmailServices: ['google-mail', 'microsoft-outlook'],
        }}
      >
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    const emailServiceSelectInput = await screen.findByTestId('emailServiceSelectInput');
    expect(emailServiceSelectInput).toBeInTheDocument();
    expect(emailServiceSelectInput).toHaveValue('gmail');
  });

  it('does not override the service if it is defined', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
        service: 'gmail',
      },
      isDeprecated: false,
    };

    appMockRenderer.render(
      <ConnectorFormTestProvider
        connector={actionConnector}
        connectorServices={{
          validateEmailAddresses,
          enabledEmailServices,
        }}
      >
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    const emailServiceSelectInput = await screen.findByTestId('emailServiceSelectInput');
    expect(emailServiceSelectInput).toBeInTheDocument();
    expect(emailServiceSelectInput).toHaveValue('gmail');
  });
});
