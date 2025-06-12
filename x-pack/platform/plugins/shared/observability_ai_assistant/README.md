### **1. Observability AI Assistant Overview**

#### **1.1. Introduction**

This document gives an overview of the features of the Observability AI Assistant at the time of writing, and how to use them. At a high level, the Observability AI Assistant offers contextual insights, and a chat functionality that we enrich with function calling, allowing the LLM to hook into the user's data. We also allow the LLM to store things it considers new information as embeddings into Elasticsearch, and query this knowledge base when it decides it needs more information, using ELSER.

#### **1.1. Configuration**

Users can connect to an LLM using [connectors](https://www.elastic.co/guide/en/kibana/current/action-types.html) - specifically the [OpenAI connector](https://www.elastic.co/guide/en/kibana/current/openai-action-type.html) or the [Bedrock connector](https://www.elastic.co/guide/en/kibana/current/bedrock-action-type.html), which currently supports both OpenAI and Azure OpenAI as providers. The connector is Enterprise-only. Users can also leverage [preconfigured connectors](https://www.elastic.co/guide/en/kibana/current/pre-configured-connectors.html), in which case the following should be added to `kibana.yml`:

```yaml
xpack.actions.preconfigured:
	azure-open-ai:
		actionTypeId: .gen-ai
		name: Azure OpenAI
		config:
			apiUrl: https://<resourceName>.openai.azure.com/openai/deployments/<deploymentName>/chat/completions?api-version=<apiVersion>
			apiProvider: Azure OpenAI
		secrets:
			apiKey: <myApiKey>
```

**Note**: For the OpenAI connector, the configured deployed model should support [function calling](https://platform.openai.com/docs/guides/gpt/function-calling). For OpenAI, this is usually the case. For Azure, the minimum `apiVersion` is `2023-07-01-preview`. We also recommend a model with a pretty sizable token context length.

#### **1.2. Feature controls**

Access to the Observability AI Assistant and its APIs is managed through [Kibana privileges](https://www.elastic.co/guide/en/kibana/current/kibana-privileges.html).

The feature privilege is only available to those with an Enterprise license.

#### **1.2. Access Points**

- **1.2.1. Contextual insights**

In several places in the Observability apps, the AI Assistant can generate content that helps users understand what they are looking at. We call these contextual insights. Some examples:

- In Profiling, the AI Assistant explains a displayed function and suggests optimisation opportunities
- In APM, it explains the meaning of a specific error or exception and offers common causes and possible impact
- In Alerting, the AI Assistant takes the results of the log spike analysis, and tries to find a root cause for the spike

The user can then also continue the conversation in a flyout by clicking "Start chat".

- **1.2.2. Action Menu Button**

When navigating through Observability apps, there is an Assistant menu in the top button. Click it to start a new conversation or access existing ones.

- **1.2.3. Standalone page**

Users can also access existing conversations and create a new one by navigating to `/app/observabilityAIAssistant/conversations/new`. They can also find this link in the search bar.

#### **1.3. Chat**

Conversations with the AI Assistant are powered by three foundational components: the LLM, the knowledge base, and function calling.

The LLM essentially sits between the platform and the user. Its purpose is to interpret both the messages from the user and the response from the functions called, and offer its conclusions and suggest next steps. It can suggest functions on its own, and it has read and write access to the knowledge base.

The knowledge base is an Elasticsearch index, with an inference processor powered by ELSER. This enables us to query the knowledge base with the users original question, using semantic search.
Kibana developers can preload embeddings into this index, and users can access them too, via plain Elasticsearch APIs or specific Kibana APIs. Additionally, the LLM can query the knowledge base for additional context and store things it has learned from a conversation.

Both the user and the LLM are able to suggest functions, that are executed on behalf (and with the privileges of) the user. Functions allow both the user and the LLM to include relevant context into the conversation. This context can be text, data, or a visual component, like a timeseries graph. Some of the functions that are available are:

- `context` and `summarize`: these functions query (with a semantic search) or write to (with a summarisation) the knowledge database. This allows the LLM to create a (partly) user-specific working memory, and access predefined embeddings that help improve its understanding of the Elastic platform.

- `query`: a function that will generate an ES|QL query based on the user's question.

- `alerts`: gets the alerts for the current time range.

Function calling is completely transparent to the user - they can edit function suggestions from the LLM, or inspect a function response (but not edit it), or they can request a function themselves.

### **2. Integrating with the AI Assistant**

There are a couple of ways to integrate with the AI Assistant: functions, screen context, contextual insights, or through the API.

**Note: when you're requiring the `observabilityAIAssistant` plugin as a dependency, make sure it's optional - users might have disabled it entirely.**

#### **2.1** Functions

Functions are the heartbeat of the Assistant. It allows the LLM to pull data from the Platform, rather than us just pushing it.

Functions are available everywhere, and should be used sparingly. They're especially useful for very specific tasks that require an interpretation of the user's prompt from the LLM. E.g., to convert a user question into an ES|QL query. If you simply want to attach data, there's no need to register a function. You can use the screen context API for this.

They have a name and description for the LLM. They can also define parameters so the LLM understands how to call the function. These parameters are defined as a JSON Schema. Additionally, functions have what we call `respond` and `render` functions.

The `respond` function is called on the server, with the arguments that the LLM has sent over (based on the parameters we have defined). The `respond` function is asynchronous, and can fetch data, and format it for the LLM to use. It can return a message, which is in the format of `{ content: { ... }, data: { ... } }`. `content` is what the LLM eventually sees as the function response. `data` is optional, and can be used to store data that is not used by the LLM, but for instance is used for visualizations or debugging. You can also return an Observable, which allows you to emit multiple messages.

The (optional) `render` function is executed on the client, and gets access to the reply from the `respond` function - so both `content` and `data` are available. It can then render a React component based on the content and data.

Functions can be centrally registered by calling `register` on the `observability-ai-assistant` plugin's server contract:

```ts
observabilityAIAssistant?.register(async ({ registerFunction }) => {
  registerFunction(
    {
      name: 'my_function',
      description: `My function description`,
      parameters: {
        type: 'object',
        properties: {
          myParameter: {
            type: 'string',
            description: 'A parameter',
          },
        },
        required: ['myParameter'],
      } as const,
    },
    async ({ arguments: { myParameter } }, signal) => {
      return {
        content: {
          myFunctionResults: [await getAsynchronousFunctionResults()],
        },
      };
    }
  );
});
```

If you want to render UI as well for this function, use the same `register` function on the observability-ai-assistant` plugin's **public** contract:

```jsx
observabilityAIAssistant?.register(async ({ registerRenderFunction }) => {
  registerRenderFunction(
    'my_function',
    ({ arguments: { myParameter }, content: { myFunctionResults }, data: {} }, signal) => {
      return <MyComponent />;
    }
  );
});
```

The user can also call these functions explicitly - if you don't want this, set `visibility` on the function definition to `FunctionVisibility.AssistantOnly`. In this case, the user cannot call it themselves.

#### **2.2** Contextual insights

Contextual insights are UI components that can be embedded on any page. Their intent is to "explain" available data on the page to the user, with the help of the LLM. For instance, there is a contextual insight on the APM error detail page that explains what the error means.

To add a contextual insight, use `ObservabilityAIAssistantContextualInsight` from the public plugin's start contract and the `getContextualInsightMessages` helper function:

```ts
const { ObservabilityAIAssistantContextualInsight, getContextualInsightMessages } = plugins.observabilityAIAssistant;

const messages = useMemo(( ) => {
	return getContextualInsightMessages({
		message: "Can you explain what this error is",
		instructions: JSON.stringify(myErrorData);
	});
}, [ myErrorData ]);

return <ObservabilityAIAssistantContextualInsight messages={messages}/>;
```

#### **2.3** Screen context

Screen context is how the AI Assistant is aware of what the user is looking at. It also allows the Assistant to interact with the page, via something we call actions. On each user message, the screen context is injected in the conversation and sent over the LLM. It consists of the following parts:

- `description`: this is a natural language description of the page. You can mix "what kind of page is this" with "what specific data is the user looking at". This is always sent over to the LLM.
- `data`: this is an array of key/value pairs along with a description. This is not sent over to the LLM immediately, but the LLM is made aware of its existence. It can then pull in this data via a function request. This is done to keep the token cost down initially, but still keep the option open for the LLM to use it if it deems it necessary.
- `actions`: actions are functions that are executed _client-side_ instead of server-side. That means that these functions can easily interact with the page, e.g. via React state updates or other API calls. For instance, you can use this to allow the Assistant to navigate to another page or fill in a form.

From the start contract, you can use `service.setScreenContext`:

```ts
useEffect(() => {
  return observabilityAIAssistant?.service.setScreenContext({
    description: 'Description of the page',
  });
}, [observabilityAIAssistant?.service]);
```

`setScreenContext` returns a function that removes the screen context when called. **It's important that this function is returned to the `useEffect` hook,** to make sure it's called when its dependencies change, or when the component unmounts. If this doesn't happen, you'll duplicate context.

Here's how to add data:

```ts
useEffect(() => {
  return observabilityAIAssistant?.service.setScreenContext({
    data: [
      {
        name: 'my_data',
        description: 'All of my data',
        value: allMyData,
      },
    ],
  });
}, [observabilityAIAssistant?.service, allMyData]);
```

`allMyData` here is sent over the wire to the LLM, so it needs to be serializable (e.g., you cannot include functions, but you can include structured data).

Finally, for actions:

```ts
import { createScreenContext } from '@kbn/observability-ai-assistant-plugin/public';
useEffect(() => {
  return observabilityAIAssistant?.service.setScreenContext({
    actions: createScreenContextAction(
      {
        name: 'navigate_to_home',
        description: 'Navigate to the home page',
        parameters: {
          type: 'object',
          properties: {
            myProperty: 'myValue',
          },
        },
      },
      async ({ arguments: { myProperty } }) => {
        return doSomethingOnThePage()
          .then(( response ) => {
            return { content: { response } } };
          })
      }
    ),
  });
}, [observabilityAIAssistant?.service]);
```

Any data you return will be sent back to the AI Assistant. `createScreenContext` is a utility function that allows you to get typed arguments to your `respond` function. You can also define the action without it.
