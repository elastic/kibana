# Sub actions framework

## Summary

The Kibana actions plugin provides a framework to create executable actions that supports sub actions. That means you can execute different flows (sub actions) when you execute an action. The framework provides tools to aid you to focus only on the business logic of your connector. You can:

- Register a sub action and map it to a function of your choice.
- Define a schema for the parameters of your sub action.
- Define custom validators (or use the provided helpers) for the parameters of your sub action.
- Define a response schema for responses from external services.
- Create connectors that are supported by the Cases management system.

The framework is built on top of the current actions framework and it is not a replacement of it. All practices described on the plugin's main [README](../../README.md#developing-new-action-types) applies to this framework also.

## Classes

The framework provides two classes. The `SubActionConnector` class and the `CaseConnector` class. When registering your connector you should provide a class that implements the business logic of your connector. The class must extend one of the two classes provided by the framework. The classes provides utility functions to register sub actions and make requests to external services.


If you extend the `SubActionConnector`, you should implement the following abstract methods:
- `getResponseErrorMessage(error: AxiosError): string;`


If you extend the `CaseConnector`, you should implement the following abstract methods:

- `getResponseErrorMessage(error: AxiosError): string;`
- `addComment({ incidentId, comment }): Promise<unknown>`
- `createIncident(incident): Promise<ExternalServiceIncidentResponse>`
- `updateIncident({ incidentId, incident }): Promise<ExternalServiceIncidentResponse>`
- `getIncident({ id }): Promise<ExternalServiceIncidentResponse>`

where

```
interface ExternalServiceIncidentResponse {
  id: string;
  title: string;
  url: string;
  pushedDate: string;
}
```

The `CaseConnector` class registers automatically the `pushToService` sub action and implements the corresponding method that is needed by Cases.


### Class Diagrams

```mermaid
classDiagram
      SubActionConnector <|-- CaseConnector

      class SubActionConnector{
        -subActions
        #config
        #secrets
        #registerSubAction(subAction)
        +getResponseErrorMessage(error)*
        +getSubActions()
        +registerSubAction(subAction)
    }

    class CaseConnector{
        +addComment(comment)*
        +createIncident(incident)*
        +updateIncident(incidentId, incident)*
        +getIncident(incidentId)*
        +pushToService(params)
    }
```

### Examples of extending the classes

```mermaid
classDiagram
      SubActionConnector <|-- CaseConnector
      SubActionConnector <|-- Tines
      CaseConnector <|-- ServiceNow

      class SubActionConnector{
        -subActions
        #config
        #secrets
        #registerSubAction(subAction)
        +getSubActions()
        +register(params)
    }

    class CaseConnector{
        +addComment(comment)*
        +createIncident(incident)*
        +updateIncident(incidentId, incident)*
        +getIncident(incidentId)*
        +pushToService(params)
    }

    class ServiceNow{
        +getFields()
        +getChoices()
    }

    class Tines{
        +getStories()
        +getWebooks(storyId)
        +runAction(actionId)
    }
```

## Usage

This guide assumes that you created a class that extends one of the two classes provided by the framework.

### Register a sub action

To register a sub action use the `registerSubAction` method provided by the base classes. It expects the name of the sub action, the name of the method of the class that will be called when the sub action is triggered, and a validation schema for the sub action parameters. Example:

```
this.registerSubAction({ name: 'fields', method: 'getFields', schema: schema.object({ incidentId: schema.string() }) })
```

If your method does not accepts any arguments pass `null` to the schema property. Example:

```
this.registerSubAction({ name: 'noParams', method: 'noParams', schema: null })
```

### Request to an external service

To make a request to an external you should use the `request` method provided by the base classes. It accepts all attributes of the [request configuration object](https://github.com/axios/axios#request-config) of axios plus the expected response schema. Example:

```
const res = await this.request({
        auth: this.getBasicAuth(),
        url: 'https://example/com/api/incident/1',
        method: 'get',
        responseSchema: schema.object({ id: schema.string(), name: schema.string() }) },
      });
```

The message returned by the `getResponseErrorMessage` method will be used by the framework as an argument to the constructor of the `Error` class. Then the framework will thrown the `error`.

The request method does the following:

- Logs the request URL and method for debugging purposes.
- Asserts the URL.
- Normalizes the URL.
- Ensures that the URL is in the allow list.
- Configures proxies.
- Validates the response.

### Error messages from external services

Each external service has a different response schema for errors. For that reason, you have to implement the abstract method `getResponseErrorMessage` which returns a string representing the error message of the response. Example:

```
interface ErrorSchema {
  errorMessage: string;
  errorCode: number;
}

protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Message: ${error.response?.data.errorMessage}. Code: ${error.response?.data.errorCode}`;
  }
```

### Remove null or undefined values from data

There is a possibility that an external service would throw an error for fields with `null` values. For that reason, the base classes provide the `removeNullOrUndefinedFields` utility function to remove or `null` or `undefined` values from an object. Example:

```
// Returns { foo: 'foo' }
this.removeNullOrUndefinedFields({ toBeRemoved: null, foo: 'foo' })
```

## Example: Sub action connector

```
import { schema, TypeOf } from '@kbn/config-schema';
import { AxiosError } from 'axios';
import { SubActionConnector } from './basic';
import { CaseConnector } from './case';
import { ExternalServiceIncidentResponse, ServiceParams } from './types';

export const TestConfigSchema = schema.object({ url: schema.string() });
export const TestSecretsSchema = schema.object({
  username: schema.string(),
  password: schema.string(),
});
export type TestConfig = TypeOf<typeof TestConfigSchema>;
export type TestSecrets = TypeOf<typeof TestSecretsSchema>;

interface ErrorSchema {
  errorMessage: string;
  errorCode: number;
}

export class TestBasicConnector extends SubActionConnector<TestConfig, TestSecrets> {
  constructor(params: ServiceParams<TestConfig, TestSecrets>) {
    super(params);
    this.registerSubAction({
      name: 'mySubAction',
      method: 'triggerSubAction',
      schema: schema.object({ id: schema.string() }),
    });
  }

  protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Message: ${error.response?.data.errorMessage}. Code: ${error.response?.data.errorCode}`;
  }

  public async triggerSubAction({ id  }: { id: string; }) {
    const res = await this.request({
      url,
      data,
      headers: { 'X-Test-Header': 'test' },
      responseSchema: schema.object({ status: schema.string() }),
    });

    return res;
  }
}
```

## Example: Case connector

```
import { schema, TypeOf } from '@kbn/config-schema';
import { AxiosError } from 'axios';
import { SubActionConnector } from './basic';
import { CaseConnector } from './case';
import { ExternalServiceIncidentResponse, ServiceParams } from './types';

export const TestConfigSchema = schema.object({ url: schema.string() });
export const TestSecretsSchema = schema.object({
  username: schema.string(),
  password: schema.string(),
});
export type TestConfig = TypeOf<typeof TestConfigSchema>;
export type TestSecrets = TypeOf<typeof TestSecretsSchema>;

interface ErrorSchema {
  errorMessage: string;
  errorCode: number;
}

export class TestCaseConnector extends CaseConnector<TestConfig, TestSecrets> {
  constructor(params: ServiceParams<TestConfig, TestSecrets>) {
    super(params);
    this.registerSubAction({
      name: 'categories',
      method: 'getCategories',
      schema: null,
    });
  }

  protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Message: ${error.response?.data.errorMessage}. Code: ${error.response?.data.errorCode}`;
  }

  public async createIncident(incident: {
    incident: Record<string, { title: string; }> 
  }): Promise<ExternalServiceIncidentResponse> {
    const res = await this.request({
      method: 'post',
      url: 'https://example.com/api/incident',
      data: { incident },
      responseSchema: schema.object({ id: schema.string(), title: schema.string() }),
    });

    return {
      id: res.data.id,
      title: res.data.title,
      url: 'https://example.com',
      pushedDate: '2022-05-06T09:41:00.401Z',
    };
  }

  public async addComment({
    incidentId,
    comment,
  }: {
    incidentId: string;
    comment: string;
  }): Promise<ExternalServiceIncidentResponse> {
    const res = await this.request({
      url: `https://example.com/api/incident/${incidentId}/comment`,
      data: { comment },
      responseSchema: schema.object({ id: schema.string(), title: schema.string() }),
    });

    return {
      id: res.data.id,
      title: res.data.title,
      url: 'https://example.com',
      pushedDate: '2022-05-06T09:41:00.401Z',
    };
  }

  public async updateIncident({
    incidentId,
    incident,
  }: {
    incidentId: string;
    incident: { category: string };
  }): Promise<ExternalServiceIncidentResponse> {
    const res = await this.request({
      method: 'put',
      url: `https://example.com/api/incident/${incidentId}`',
      responseSchema: schema.object({ id: schema.string(), title: schema.string() }),
    });

    return {
      id: res.data.id,
      title: res.data.title,
      url: 'https://example.com',
      pushedDate: '2022-05-06T09:41:00.401Z',
    };
  }

  public async getIncident({ id }: { id: string }): Promise<ExternalServiceIncidentResponse> {
    const res = await this.request({
      url: 'https://example.com/api/incident/1',
      responseSchema: schema.object({ id: schema.string(), title: schema.string() }),
    });

    return {
      id: res.data.id,
      title: res.data.title,
      url: 'https://example.com',
      pushedDate: '2022-05-06T09:41:00.401Z',
    };
  }

  public async getCategories() {
    const res = await this.request({
      url: 'https://example.com/api/categories',
      responseSchema: schema.object({ categories: schema.array(schema.string()) }),
    });

    return res;
  }
```

### Example: Register sub action connector

The actions framework exports the `registerSubActionConnectorType` to register sub action connectors. Example:

```
plugins.actions.registerSubActionConnectorType({
  id: 'test.sub-action-connector',
  name: 'Test: Sub action connector',
  minimumLicenseRequired: 'platinum' as const,
  schema: { config: TestConfigSchema, secrets: TestSecretsSchema },
  getService: (params) => new TestSubActionConnector(params),
  renderParameterTemplates: renderTestTemplate
});
```

You can see a full example in [x-pack/test/alerting_api_integration/common/plugins/alerts/server/sub_action_connector.ts](../../../../test/alerting_api_integration/common/plugins/alerts/server/sub_action_connector.ts)

### Example: Register sub action connector with custom validators

The sub actions framework allows custom validators during registration of the connector type. Below is an example of including the URL validation for the `TestSubActionConnector` `url` configuration field.

```typescript
plugins.actions.registerSubActionConnectorType({
  id: 'test.sub-action-connector',
  name: 'Test: Sub action connector',
  minimumLicenseRequired: 'platinum' as const,
  schema: { config: TestConfigSchema, secrets: TestSecretsSchema },
  validators: [{type: ValidatorType.CONFIG, validate: urlAllowListValidator('url')}]
  getService: (params) => new TestSubActionConnector(params),
});
```
