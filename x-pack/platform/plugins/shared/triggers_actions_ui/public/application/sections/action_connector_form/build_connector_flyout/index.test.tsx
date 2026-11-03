/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedCodeEditor } from '@kbn/code-editor-mock';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';
import { BuildConnectorFlyout } from '.';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../lib/action_connector_api', () => ({
  ...(jest.requireActual('../../../lib/action_connector_api') as object),
  createConnectorType: jest.fn(),
  generateConnectorType: jest.fn(),
}));
const mockCodeEditor = jest.fn();
jest.mock('@kbn/code-editor', () => ({
  ...(jest.requireActual('@kbn/code-editor') as object),
  CodeEditor: (props: React.ComponentProps<typeof MockedCodeEditor>) => {
    mockCodeEditor(props);
    return <MockedCodeEditor {...props} />;
  },
}));
const { createConnectorType, generateConnectorType } = jest.requireMock(
  '../../../lib/action_connector_api'
);

const yamlDefinition = `
id: .acme
displayName: Acme
description: Talks to Acme
auth:
  type: api_key_header
  headerName: X-Api-Key
config:
  - name: baseUrl
    type: string
    required: true
actions:
  ping:
    description: Ping
    scope: read
    input: []
    request:
      method: GET
      url: "{{config.baseUrl}}/ping"
`;

const yamlEditor = () =>
  within(screen.getByTestId('build-connector-flyout-yaml-panel')).getByTestId('mockedCodeEditor');
const bodyEditor = (actionIndex: number) =>
  within(screen.getByTestId(`buildConnectorAction-${actionIndex}-body`)).getByTestId(
    'mockedCodeEditor'
  );

const typeYaml = async (yaml: string) => {
  await userEvent.click(await screen.findByTestId('build-connector-flyout-yaml-toggle'));
  fireEvent.change(yamlEditor(), { target: { value: yaml } });
};

const applyYaml = async (yaml: string) => {
  await typeYaml(yaml);
  await userEvent.click(screen.getByTestId('build-connector-flyout-yaml-apply-btn'));
  await waitFor(() => expect(screen.getByTestId('buildConnectorNameInput')).toHaveValue('Acme'));
};

describe('BuildConnectorFlyout', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    createConnectorType.mockResolvedValue({ id: '.my-service' });
  });

  it('renders the YAML import, the form fields, one empty action and the footer buttons', async () => {
    appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

    expect(await screen.findByRole('heading', { name: 'Build a connector' })).toBeInTheDocument();
    expect(screen.getByTestId('build-connector-flyout-yaml-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorNameInput')).toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorIdInput')).toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorDescriptionInput')).toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorAuthTypeSelect')).toHaveValue('none');
    expect(screen.queryByTestId('buildConnectorAuthHeaderNameInput')).not.toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorConfigFields')).toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorAction-0')).toBeInTheDocument();
    expect(screen.queryByTestId('buildConnectorAction-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('buildConnectorAction-0-scope')).toHaveValue('write');
    expect(screen.getByTestId('buildConnectorAction-0-method')).toHaveValue('POST');
    expect(screen.getByTestId('build-connector-flyout-close-btn')).toBeInTheDocument();
    expect(screen.getByTestId('build-connector-flyout-save-btn')).toBeInTheDocument();
  });

  it('lets the user drag the YAML and JSON body editors taller', async () => {
    appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);
    await screen.findByTestId('buildConnectorAction-0-body');

    expect(screen.getByTestId('build-connector-flyout-yaml-editor-container')).toHaveStyle({
      resize: 'vertical',
    });
    expect(screen.getByTestId('buildConnectorAction-0-body-editor-container')).toHaveStyle({
      resize: 'vertical',
    });
    expect(mockCodeEditor).toHaveBeenCalledWith(
      expect.objectContaining({ languageId: 'yaml', height: 220 })
    );
    expect(mockCodeEditor).toHaveBeenCalledWith(
      expect.objectContaining({ languageId: 'json', height: 160 })
    );
    expect(mockCodeEditor).not.toHaveBeenCalledWith(
      expect.objectContaining({ allowFullScreen: true })
    );
  });

  it('derives the ID from the name until it is customized', async () => {
    appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

    await userEvent.type(await screen.findByTestId('buildConnectorNameInput'), 'My Service');
    await waitFor(() =>
      expect(screen.getByTestId('buildConnectorIdInput')).toHaveValue('my-service')
    );

    await userEvent.clear(screen.getByTestId('buildConnectorIdInput'));
    await userEvent.type(screen.getByTestId('buildConnectorIdInput'), '.custom');
    await userEvent.type(screen.getByTestId('buildConnectorNameInput'), ' Two');

    await waitFor(() =>
      expect(screen.getByTestId('buildConnectorNameInput')).toHaveValue('My Service Two')
    );
    expect(screen.getByTestId('buildConnectorIdInput')).toHaveValue('.custom');
  });

  it('shows the header name field only for API key header auth', async () => {
    appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

    await userEvent.selectOptions(
      await screen.findByTestId('buildConnectorAuthTypeSelect'),
      'api_key_header'
    );
    expect(await screen.findByTestId('buildConnectorAuthHeaderNameInput')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByTestId('buildConnectorAuthTypeSelect'), 'bearer');
    await waitFor(() =>
      expect(screen.queryByTestId('buildConnectorAuthHeaderNameInput')).not.toBeInTheDocument()
    );
  });

  describe('tooltips', () => {
    it('explains the config object', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      expect(await screen.findByTestId('buildConnectorConfigFields-description')).toHaveTextContent(
        'Entered when a connector of this type is created. Use as {{config.<name>}}.'
      );
      fireEvent.mouseOver(screen.getByTestId('buildConnectorConfigFields-info'));
      expect(
        await screen.findByText(/entered once, when a user creates a connector of this type/)
      ).toBeInTheDocument();
    });

    it('explains the params object of an action', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      expect(
        await screen.findByTestId('buildConnectorAction-0-input-description')
      ).toHaveTextContent(
        'Provided by a rule each time this action runs. Use as {{input.<name>}}.'
      );
      fireEvent.mouseOver(screen.getByTestId('buildConnectorAction-0-input-info'));
      expect(
        await screen.findByText(/provided by a rule each time this action runs/)
      ).toBeInTheDocument();
    });

    it('explains the label property of a field', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await userEvent.click(await screen.findByTestId('buildConnectorConfigFields-add'));
      fireEvent.mouseOver(screen.getByTestId('buildConnectorConfigFields-0-label-info'));

      expect(
        await screen.findByText(/Display name of this field in the form where its value is entered/)
      ).toBeInTheDocument();
    });
  });

  describe('YAML import', () => {
    it('shows an error and disables the YAML buttons while the YAML is invalid', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await typeYaml('id: [unclosed');
      expect(await screen.findByText(/Flow sequence/)).toBeInTheDocument();
      expect(screen.getByTestId('build-connector-flyout-yaml-apply-btn')).toBeDisabled();
      expect(screen.getByTestId('build-connector-flyout-yaml-beautify-btn')).toBeDisabled();

      fireEvent.change(yamlEditor(), { target: { value: '- just\n- a list\n' } });
      expect(
        await screen.findByText('The YAML must describe a single connector type definition.')
      ).toBeInTheDocument();
      expect(screen.getByTestId('build-connector-flyout-yaml-apply-btn')).toBeDisabled();
    });

    it('rejects a definition whose config or input is a map instead of a list', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await typeYaml('displayName: Acme\nconfig:\n  baseUrl:\n    type: string\n');
      expect(
        await screen.findByText(
          '"config" must be a list of fields, each with a name and a type (and optionally required, label and description).'
        )
      ).toBeInTheDocument();
      expect(screen.getByTestId('build-connector-flyout-yaml-apply-btn')).toBeDisabled();

      fireEvent.change(yamlEditor(), {
        target: { value: 'actions:\n  ping:\n    input:\n      message: string\n' },
      });
      expect(
        await screen.findByText(/"actions\.ping\.input" must be a list of fields/)
      ).toBeInTheDocument();

      fireEvent.change(yamlEditor(), { target: { value: 'actions:\n  - ping\n' } });
      expect(
        await screen.findByText('"actions" must be a map keyed by action name.')
      ).toBeInTheDocument();
    });

    it('rejects unknown keys and names the allowed ones', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await typeYaml(yamlDefinition.replace('input: []', 'params: []'));
      expect(
        await screen.findByText(
          '"actions.ping" has an unknown key "params". Allowed keys: description, scope, input, request.'
        )
      ).toBeInTheDocument();
      expect(screen.getByTestId('build-connector-flyout-yaml-apply-btn')).toBeDisabled();

      fireEvent.change(yamlEditor(), { target: { value: 'name: Acme\n' } });
      expect(
        await screen.findByText(
          'Unknown top-level key "name". Allowed keys: id, displayName, description, auth, config, actions.'
        )
      ).toBeInTheDocument();
    });

    it('shows what the schema rejects right after applying, before Save', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await applyYaml(yamlDefinition.replace('{{config.baseUrl}}', '{{config.missing}}'));

      expect(await screen.findByTestId('buildConnectorAction-0-request-error')).toHaveTextContent(
        'Template reference "config.missing" is not declared for this connector or action.'
      );
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('beautifies the YAML in place', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await typeYaml('{id: .acme, displayName: Acme,   auth: {type: none}}');
      await userEvent.click(screen.getByTestId('build-connector-flyout-yaml-beautify-btn'));

      await waitFor(() =>
        expect(yamlEditor()).toHaveValue('id: .acme\ndisplayName: Acme\nauth:\n  type: none\n')
      );
    });

    it('fills the whole form from the YAML without submitting', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await applyYaml(yamlDefinition);

      expect(screen.getByTestId('buildConnectorIdInput')).toHaveValue('acme');
      expect(screen.getByTestId('buildConnectorDescriptionInput')).toHaveValue('Talks to Acme');
      expect(screen.getByTestId('buildConnectorAuthTypeSelect')).toHaveValue('api_key_header');
      expect(screen.getByTestId('buildConnectorAuthHeaderNameInput')).toHaveValue('X-Api-Key');
      expect(screen.getByTestId('buildConnectorConfigFields-0-name')).toHaveValue('baseUrl');
      expect(screen.getByTestId('buildConnectorConfigFields-0-required')).toBeChecked();
      expect(screen.getByTestId('buildConnectorAction-0-name')).toHaveValue('ping');
      expect(screen.getByTestId('buildConnectorAction-0-description')).toHaveValue('Ping');
      expect(screen.getByTestId('buildConnectorAction-0-scope')).toHaveValue('read');
      expect(screen.getByTestId('buildConnectorAction-0-method')).toHaveValue('GET');
      expect(screen.getByTestId('buildConnectorAction-0-url')).toHaveValue(
        '{{config.baseUrl}}/ping'
      );
      expect(screen.queryByTestId('buildConnectorAction-1')).not.toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('submits the applied definition unchanged when Save is clicked', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await applyYaml(yamlDefinition);
      await userEvent.click(screen.getByTestId('build-connector-flyout-save-btn'));

      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: {
              id: 'acme',
              displayName: 'Acme',
              description: 'Talks to Acme',
              auth: { type: 'api_key_header', headerName: 'X-Api-Key' },
              config: [{ name: 'baseUrl', type: 'string', required: true }],
              actions: {
                ping: {
                  description: 'Ping',
                  scope: 'read',
                  input: [],
                  request: { method: 'GET', url: '{{config.baseUrl}}/ping' },
                },
              },
            },
          })
        )
      );
      await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('carries an optional request path through the form and the request', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await applyYaml(
        yamlDefinition.replace(
          'url: "{{config.baseUrl}}/ping"',
          'url: "{{config.baseUrl}}"\n      path: /v1/ping'
        )
      );
      expect(screen.getByTestId('buildConnectorAction-0-url')).toHaveValue('{{config.baseUrl}}');
      expect(screen.getByTestId('buildConnectorAction-0-path')).toHaveValue('/v1/ping');

      await userEvent.click(screen.getByTestId('build-connector-flyout-save-btn'));

      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: expect.objectContaining({
              actions: {
                ping: expect.objectContaining({
                  request: { method: 'GET', url: '{{config.baseUrl}}', path: '/v1/ping' },
                }),
              },
            }),
          })
        )
      );
    });

    it('reports a template reference issue under the request that uses it', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await applyYaml(yamlDefinition.replace('{{config.baseUrl}}', '{{config.missing}}'));
      await userEvent.click(screen.getByTestId('build-connector-flyout-save-btn'));

      expect(await screen.findByTestId('buildConnectorAction-0-request-error')).toHaveTextContent(
        'Template reference "config.missing" is not declared for this connector or action.'
      );
      expect(createConnectorType).not.toHaveBeenCalled();
    });
  });

  describe('config fields', () => {
    it('adds and removes rows', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      expect(screen.queryByTestId('buildConnectorConfigFields-row-0')).not.toBeInTheDocument();

      await userEvent.click(await screen.findByTestId('buildConnectorConfigFields-add'));
      await userEvent.type(screen.getByTestId('buildConnectorConfigFields-0-name'), 'baseUrl');
      await userEvent.selectOptions(
        screen.getByTestId('buildConnectorConfigFields-0-type'),
        'number'
      );
      await userEvent.click(screen.getByTestId('buildConnectorConfigFields-0-required'));
      await userEvent.click(screen.getByTestId('buildConnectorConfigFields-add'));
      await userEvent.type(screen.getByTestId('buildConnectorConfigFields-1-name'), 'region');

      expect(screen.getByTestId('buildConnectorConfigFields-0-type')).toHaveValue('number');
      expect(screen.getByTestId('buildConnectorConfigFields-0-required')).toBeChecked();

      await userEvent.click(screen.getByTestId('buildConnectorConfigFields-0-remove'));

      await waitFor(() =>
        expect(screen.queryByTestId('buildConnectorConfigFields-row-1')).not.toBeInTheDocument()
      );
      expect(screen.getByTestId('buildConnectorConfigFields-0-name')).toHaveValue('region');
    });

    it('shows a row error for an invalid field name', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await userEvent.click(await screen.findByTestId('buildConnectorConfigFields-add'));
      await userEvent.type(screen.getByTestId('buildConnectorConfigFields-0-name'), '1bad');
      await userEvent.click(screen.getByTestId('build-connector-flyout-save-btn'));

      expect(
        await screen.findByText('Must start with a letter and use only letters, numbers and "_".')
      ).toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('shows a list error for duplicate field names', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await userEvent.click(await screen.findByTestId('buildConnectorConfigFields-add'));
      await userEvent.type(screen.getByTestId('buildConnectorConfigFields-0-name'), 'baseUrl');
      await userEvent.click(screen.getByTestId('buildConnectorConfigFields-add'));
      await userEvent.type(screen.getByTestId('buildConnectorConfigFields-1-name'), 'baseUrl');
      await userEvent.click(screen.getByTestId('build-connector-flyout-save-btn'));

      expect(await screen.findByTestId('buildConnectorConfigFields-error')).toHaveTextContent(
        'Field names must be unique.'
      );
      expect(createConnectorType).not.toHaveBeenCalled();
    });
  });

  describe('actions', () => {
    it('submits an action built in the form with input fields, headers and a JSON body', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await userEvent.type(await screen.findByTestId('buildConnectorNameInput'), 'My Service');
      await userEvent.type(screen.getByTestId('buildConnectorAction-0-name'), 'notify');
      await userEvent.type(screen.getByTestId('buildConnectorAction-0-description'), 'Send it');
      await userEvent.click(screen.getByTestId('buildConnectorAction-0-input-add'));
      await userEvent.type(screen.getByTestId('buildConnectorAction-0-input-0-name'), 'message');
      await userEvent.type(
        screen.getByTestId('buildConnectorAction-0-url'),
        'https://example.com/notify'
      );
      await userEvent.click(screen.getByTestId('buildConnectorAction-0-headers-add'));
      await userEvent.type(
        screen.getByTestId('buildConnectorAction-0-headers-0-key'),
        'Content-Type'
      );
      await userEvent.type(
        screen.getByTestId('buildConnectorAction-0-headers-0-value'),
        'application/json'
      );
      fireEvent.change(bodyEditor(0), { target: { value: '{"text": "{{input.message}}"}' } });
      await userEvent.click(screen.getByTestId('build-connector-flyout-save-btn'));

      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: expect.objectContaining({
              id: 'my-service',
              actions: {
                notify: {
                  description: 'Send it',
                  scope: 'write',
                  input: [{ name: 'message', type: 'string', required: false }],
                  request: {
                    method: 'POST',
                    url: 'https://example.com/notify',
                    headers: { 'Content-Type': 'application/json' },
                    body: { text: '{{input.message}}' },
                  },
                },
              },
            }),
          })
        )
      );
      await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('adds and removes actions and requires at least one', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await userEvent.click(await screen.findByTestId('buildConnectorActions-add'));
      expect(screen.getByTestId('buildConnectorAction-1')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('buildConnectorAction-1-remove'));
      await userEvent.click(screen.getByTestId('buildConnectorAction-0-remove'));
      await waitFor(() =>
        expect(screen.queryByTestId('buildConnectorAction-0')).not.toBeInTheDocument()
      );

      await userEvent.click(screen.getByTestId('build-connector-flyout-save-btn'));

      expect(await screen.findByTestId('buildConnectorActions-error')).toHaveTextContent(
        'At least one action is required.'
      );
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('shows the required and format errors of an action on Save', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await userEvent.click(await screen.findByTestId('buildConnectorAction-0-headers-add'));
      await userEvent.type(
        screen.getByTestId('buildConnectorAction-0-headers-0-key'),
        'bad header'
      );
      await userEvent.click(screen.getByTestId('build-connector-flyout-save-btn'));

      expect(await screen.findByText('Name is required.')).toBeInTheDocument();
      expect(screen.getByText('Connector type ID is required.')).toBeInTheDocument();
      expect(screen.getByText('Action name is required.')).toBeInTheDocument();
      expect(screen.getByText('URL is required.')).toBeInTheDocument();
      expect(screen.getByText('Use only letters, numbers and "-".')).toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('rejects duplicate action names', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await userEvent.type(await screen.findByTestId('buildConnectorAction-0-name'), 'ping');
      await userEvent.click(screen.getByTestId('buildConnectorActions-add'));
      await userEvent.type(screen.getByTestId('buildConnectorAction-1-name'), 'ping');
      await userEvent.click(screen.getByTestId('build-connector-flyout-save-btn'));

      expect(await screen.findByText('Action names must be unique.')).toBeInTheDocument();
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('validates the JSON body as you type and beautifies it', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      await screen.findByTestId('buildConnectorAction-0-body');
      const beautify = screen.getByTestId('buildConnectorAction-0-body-beautify');
      expect(beautify).toBeDisabled();

      fireEvent.change(bodyEditor(0), { target: { value: '{"a":' } });
      expect(await screen.findByText('Must be valid JSON.')).toBeInTheDocument();
      expect(beautify).toBeDisabled();

      fireEvent.change(bodyEditor(0), { target: { value: '[1, 2]' } });
      expect(await screen.findByText('Must be a JSON object.')).toBeInTheDocument();

      fireEvent.change(bodyEditor(0), { target: { value: '{"a":1,"b":{"c":true}}' } });
      await waitFor(() => expect(beautify).toBeEnabled());
      await userEvent.click(beautify);

      await waitFor(() =>
        expect(bodyEditor(0)).toHaveValue('{\n  "a": 1,\n  "b": {\n    "c": true\n  }\n}')
      );
      expect(screen.queryByText('Must be valid JSON.')).not.toBeInTheDocument();
    });
  });

  describe('AI assistant', () => {
    const generatedConnectorType = {
      id: 'acme',
      displayName: 'Acme',
      description: 'Talks to Acme',
      auth: { type: 'api_key_header' as const, headerName: 'X-Api-Key' },
      config: [{ name: 'baseUrl', type: 'string' as const, required: true }],
      actions: {
        ping: {
          description: 'Ping',
          scope: 'read' as const,
          input: [],
          request: { method: 'GET' as const, url: '{{config.baseUrl}}/ping' },
        },
      },
    };

    const openAiPanel = async () => {
      await userEvent.click(await screen.findByTestId('build-connector-flyout-ai-toggle'));
    };

    it('renders the toggle and the URL field', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

      expect(await screen.findByTestId('build-connector-flyout-ai-toggle')).toBeInTheDocument();
      await openAiPanel();
      expect(screen.getByTestId('build-connector-flyout-ai-url')).toBeInTheDocument();
      expect(screen.getByText('Fills the form without saving.')).toBeInTheDocument();
    });

    it('disables Generate for an empty or non-http URL', async () => {
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);
      await openAiPanel();

      const generateButton = screen.getByTestId('build-connector-flyout-ai-generate-btn');
      expect(generateButton).toBeDisabled();

      await userEvent.type(screen.getByTestId('build-connector-flyout-ai-url'), 'not-a-url');
      expect(generateButton).toBeDisabled();

      await userEvent.clear(screen.getByTestId('build-connector-flyout-ai-url'));
      await userEvent.type(
        screen.getByTestId('build-connector-flyout-ai-url'),
        'ftp://example.com/docs'
      );
      expect(generateButton).toBeDisabled();
      expect(generateConnectorType).not.toHaveBeenCalled();
    });

    it('fills the form from a generated draft and does not save it', async () => {
      generateConnectorType.mockResolvedValue({ connectorType: generatedConnectorType });
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);
      await openAiPanel();

      await userEvent.type(
        screen.getByTestId('build-connector-flyout-ai-url'),
        'https://docs.example.com/api'
      );
      await userEvent.click(screen.getByTestId('build-connector-flyout-ai-generate-btn'));

      await waitFor(() =>
        expect(screen.getByTestId('buildConnectorNameInput')).toHaveValue('Acme')
      );
      expect(screen.getByTestId('buildConnectorIdInput')).toHaveValue('acme');
      expect(screen.getByTestId('buildConnectorAuthTypeSelect')).toHaveValue('api_key_header');
      expect(screen.getByTestId('buildConnectorAuthHeaderNameInput')).toHaveValue('X-Api-Key');
      expect(screen.getByTestId('buildConnectorAction-0-name')).toHaveValue('ping');
      expect(screen.getByTestId('buildConnectorAction-0-url')).toHaveValue(
        '{{config.baseUrl}}/ping'
      );
      expect(screen.getByTestId('build-connector-flyout-ai-success')).toHaveTextContent(
        'Review the draft before saving.'
      );
      expect(createConnectorType).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('shows the callout and guidance for a typed API error', async () => {
      generateConnectorType.mockRejectedValue({
        body: {
          message: 'That host is not allowed.',
          attributes: { reason: 'blocked_destination' },
        },
      });
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);
      await openAiPanel();

      await userEvent.type(
        screen.getByTestId('build-connector-flyout-ai-url'),
        'https://docs.example.com/api'
      );
      await userEvent.click(screen.getByTestId('build-connector-flyout-ai-generate-btn'));

      const callout = await screen.findByTestId('build-connector-flyout-ai-error');
      expect(callout).toHaveTextContent('That host is not allowed.');
      expect(callout).toHaveTextContent('Use a public https documentation URL.');
      expect(createConnectorType).not.toHaveBeenCalled();
    });

    it('shows Feature Settings guidance when no model is configured', async () => {
      generateConnectorType.mockRejectedValue({
        body: {
          message: 'No AI model is available.',
          attributes: { reason: 'no_model' },
        },
      });
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);
      await openAiPanel();

      await userEvent.type(
        screen.getByTestId('build-connector-flyout-ai-url'),
        'https://docs.example.com/api'
      );
      await userEvent.click(screen.getByTestId('build-connector-flyout-ai-generate-btn'));

      const callout = await screen.findByTestId('build-connector-flyout-ai-error');
      expect(callout).toHaveTextContent(
        'Set a default AI connector, or pick a model for Connector builder in Feature Settings.'
      );
      expect(callout).not.toHaveTextContent('No AI model is available.');
    });

    it('shows try another page guidance when the model output is invalid', async () => {
      generateConnectorType.mockRejectedValue({
        body: {
          message: 'The model did not return a valid connector type.',
          attributes: { reason: 'invalid_output' },
        },
      });
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);
      await openAiPanel();

      await userEvent.type(
        screen.getByTestId('build-connector-flyout-ai-url'),
        'https://docs.example.com/api'
      );
      await userEvent.click(screen.getByTestId('build-connector-flyout-ai-generate-btn'));

      expect(await screen.findByTestId('build-connector-flyout-ai-error')).toHaveTextContent(
        'Try again or another page, then edit the form by hand.'
      );
    });

    it('submits the generated draft when Save is clicked', async () => {
      generateConnectorType.mockResolvedValue({ connectorType: generatedConnectorType });
      appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);
      await openAiPanel();

      await userEvent.type(
        screen.getByTestId('build-connector-flyout-ai-url'),
        'https://docs.example.com/api'
      );
      await userEvent.click(screen.getByTestId('build-connector-flyout-ai-generate-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('buildConnectorNameInput')).toHaveValue('Acme')
      );

      await userEvent.click(screen.getByTestId('build-connector-flyout-save-btn'));

      await waitFor(() =>
        expect(createConnectorType).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorType: {
              id: 'acme',
              displayName: 'Acme',
              description: 'Talks to Acme',
              auth: { type: 'api_key_header', headerName: 'X-Api-Key' },
              config: [{ name: 'baseUrl', type: 'string', required: true }],
              actions: {
                ping: {
                  description: 'Ping',
                  scope: 'read',
                  input: [],
                  request: { method: 'GET', url: '{{config.baseUrl}}/ping' },
                },
              },
            },
          })
        )
      );
    });
  });

  it('rejects an invalid ID format', async () => {
    appMockRenderer.render(<BuildConnectorFlyout onClose={onClose} />);

    await userEvent.type(await screen.findByTestId('buildConnectorIdInput'), 'No Dot');
    await userEvent.tab();

    expect(
      await screen.findByText('Use only lowercase letters, numbers, "_" and "-".')
    ).toBeInTheDocument();
  });
});
