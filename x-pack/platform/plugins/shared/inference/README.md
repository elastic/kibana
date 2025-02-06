# Inference plugin

The inference plugin is a central place to handle all interactions with the Elasticsearch Inference API and
external LLM APIs. Its goals are:

- Provide a single place for all interactions with large language models and other generative AI adjacent tasks.
- Abstract away differences between different LLM providers like OpenAI, Bedrock and Gemini.
- Allow us to move gradually to the \_inference endpoint without disrupting engineers.

## Usage with langchain

The inference APIs are meant to be usable directly, and self-sufficient to power any RAG workflow. 

However, we're also exposing a way to use langchain while benefiting from the inference APIs, 
via the `getChatModel` API exposed from the inference plugin's start contract.

```ts
const chatModel = await inferenceStart.getChatModel({
  request,
  connectorId: myInferenceConnectorId,
  chatModelOptions: {
    temperature: 0.2,
  },
});

// just use it as another langchain chatModel
```

Other langchain utilities are exposed from the `@kbn/inference-langchain` package.

## Architecture and examples

![architecture-schema](https://github.com/user-attachments/assets/e65a3e47-bce1-4dcf-bbed-4f8ac12a104f)

## Terminology

The following concepts are commonly used throughout the plugin:

- **chat completion**: the process in which the LLM generates the next message in the conversation. This is sometimes referred to as inference, text completion, text generation or content generation.
- **tasks**: higher level tasks that, based on its input, use the LLM in conjunction with other services like Elasticsearch to achieve a result. The example in this POC is natural language to ES|QL.
- **tools**: a set of tools that the LLM can choose to use when generating the next message. In essence, it allows the consumer of the API to define a schema for structured output instead of plain text, and having the LLM select the most appropriate one.
- **tool call**: when the LLM has chosen a tool (schema) to use for its output, and returns a document that matches the schema, this is referred to as a tool call.

## Inference connectors

Performing inference, or more globally communicating with the LLM, is done using stack connectors.

The subset of connectors that can be used for inference are called `genAI`, or `inference` connectors. 
Calling any inference APIs with the ID of a connector that is not inference-compatible will result in the API throwing an error.

The list of inference connector types:
- `.gen-ai`: OpenAI connector
- `.bedrock`: Bedrock Claude connector
- `.gemini`: Vertex Gemini connector
- `.inference`: Elastic Inference Endpoint connector

## Usage examples

The inference APIs are available via the inference client, which can be created using the inference plugin's start contract:

```ts
class MyPlugin {
  setup(coreSetup, pluginsSetup) {
    const router = coreSetup.http.createRouter();

    router.post(
      {
        path: '/internal/my_plugin/do_something',
        validate: {
          body: schema.object({
            connectorId: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        const [coreStart, pluginsStart] = await coreSetup.getStartServices();

        const inferenceClient = pluginsStart.inference.getClient({ request });

        const chatResponse = await inferenceClient.chatComplete({
          connectorId: request.body.connectorId,
          system: `Here is my system message`,
          messages: [
            {
              role: MessageRole.User,
              content: 'Do something',
            },
          ],
        });

        return response.ok({
          body: {
            chatResponse,
          },
        });
      }
    );
  }
}
```

### Binding common parameters

It is also possible to bind a client to its configuration parameters, to avoid passing connectorId
to every call, for example, using the `bindTo` parameter when creating the client.

```ts
const inferenceClient = myStartDeps.inference.getClient({
  request,
  bindTo: {
   connectorId: 'my-connector-id',
   functionCalling: 'simulated',
  }
});

const chatResponse = await inferenceClient.chatComplete({
  messages: [{ role: MessageRole.User, content: 'Do something' }],
});
```

## APIs

### `chatComplete` API:

`chatComplete` generates a response to a prompt or a conversation using the LLM. Here's what is supported:

- Normalizing request and response formats from all supported connector types
- Tool calling and validation of tool calls
- Token usage stats / events
- Streaming mode to work with chunks in real time instead of waiting for the full response

#### Standard usage

In standard mode, the API returns a promise resolving with the full LLM response once the generation is complete.
The response will also contain the token count info, if available.

```ts
const chatResponse = await inferenceClient.chatComplete({
  connectorId: 'some-gen-ai-connector',
  system: `Here is my system message`,
  messages: [
    {
      role: MessageRole.User,
      content: 'Do something',
    },
  ],
});

const { content, tokens } = chatResponse;
// do something with the output
```

#### Streaming mode

Passing `stream: true` when calling the API enables streaming mode.
In that mode, the API returns an observable instead of a promise, emitting chunks in real time.

That observable emits three types of events:

- `chunk` the completion chunks, emitted in real time
- `tokenCount` token count event, containing info about token usages, eventually emitted after the chunks
- `message` full message event, emitted once the source is done sending chunks

The `@kbn/inference-common` package exposes various utilities to work with this multi-events observable:

- `isChatCompletionChunkEvent`, `isChatCompletionMessageEvent` and `isChatCompletionTokenCountEvent` which are type guard for the corresponding event types
- `withoutChunkEvents` and `withoutTokenCountEvents`

```ts
import {
  isChatCompletionChunkEvent,
  isChatCompletionMessageEvent,
  withoutTokenCountEvents,
  withoutChunkEvents,
} from '@kbn/inference-common';

const chatComplete$ = inferenceClient.chatComplete({
  connectorId: 'some-gen-ai-connector',
  stream: true,
  system: `Here is my system message`,
  messages: [
    {
      role: MessageRole.User,
      content: 'Do something',
    },
  ],
});

// using and filtering the events
chatComplete$.pipe(withoutTokenCountEvents()).subscribe((event) => {
  if (isChatCompletionChunkEvent(event)) {
    // do something with the chunk event
  } else {
    // do something with the message event
  }
});

// or retrieving the final message
const message = await lastValueFrom(
  chatComplete$.pipe(withoutTokenCountEvents(), withoutChunkEvents())
);
```

#### Defining and using tools

Tools are defined as a record, with a `description` and optionally a `schema`. The reason why it's a record is because of type-safety. 
This allows us to have fully typed tool calls (e.g. when the name of the tool being called is `x`, its arguments are typed as the schema of `x`).

The description and schema of a tool will be converted and sent to the LLM, so it's important
to be explicit about what each tool does.

```ts
const chatResponse = await inferenceClient.chatComplete({
  connectorId: 'some-gen-ai-connector',
  system: `Here is my system message`,
  messages: [
    {
      role: MessageRole.User,
      content: 'How much is 4 plus 9?',
    },
  ],
  toolChoice: ToolChoiceType.required, // MUST call a tool
  tools: {
    date: {
      description: 'Call this tool if you need to know the current date'
    },
    add: {
      description: 'This tool can be used to add two numbers',
      schema: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'the first number' },
          b: { type: 'number', description: 'the second number'}
        },
        required: ['a', 'b']
      }
    }
  } as const // as const is required to have type inference on the schema
});

const { content, toolCalls } = chatResponse;
const toolCall = toolCalls[0];
// process the tool call and eventually continue the conversation with the LLM
```

#### Request cancellation

Request cancellation can be done by passing an abort signal when calling the API. Firing the signal
before the request completes will cause the abortion, and the API call will throw an error.

```ts
const abortController = new AbortController();

const chatResponse = await inferenceClient.chatComplete({
  connectorId: 'some-gen-ai-connector',
  abortSignal: abortController.signal,
  messages: [{ role: MessageRole.User, content: 'Do something' }],
});

// from elsewhere / before the request completes and the promise resolves:

abortController.abort();
```

The `isInferenceRequestAbortedError` helper function, exposed from `@kbn/inference-common`, can be used easily identify those errors:

```ts
import { isInferenceRequestAbortedError } from '@kbn/inference-common';

try {
  const abortController = new AbortController();
  const chatResponse = await inferenceClient.chatComplete({
    connectorId: 'some-gen-ai-connector',
    abortSignal: abortController.signal,
    messages: [{ role: MessageRole.User, content: 'Do something' }],
  });
} catch(e) {
  if(isInferenceRequestAbortedError(e)) {
    // request was aborted, do something
  } else {
    // was another error, do something else
  }
}
```

The approach is very similar for stream mode:

```ts
import { isInferenceRequestAbortedError } from '@kbn/inference-common';

const abortController = new AbortController();
const events$ = inferenceClient.chatComplete({
  stream: true,
  connectorId: 'some-gen-ai-connector',
  abortSignal: abortController.signal,
  messages: [{ role: MessageRole.User, content: 'Do something' }],
});

events$.subscribe({
  next: (event) => {
    // do something
  },
  error: (err) => {
    if(isInferenceRequestAbortedError(e)) {
      // request was aborted, do something
    } else {
      // was another error, do something else
    }
  }
});

abortController.abort();
```

### `output` API

`output` is a wrapper around the `chatComplete` API that is catered towards a specific use case: having the LLM output a structured response, based on a schema.
It's basically just making sure that the LLM will call the single tool that is exposed via the provided `schema`.
It also drops the token count info to simplify usage.

Similar to `chatComplete`, `output` supports two modes: normal full response mode by default, and optional streaming mode by passing the `stream: true` parameter.

```ts
import { ToolSchema } from '@kbn/inference-common';

// schema must be defined as full const or using the `satisfies ToolSchema` modifier for TS type inference to work
const mySchema = {
  type: 'object',
  properties: {
    animals: {
      description: 'the list of animals that are mentioned in the provided article',
      type: 'array',
      items: {
        type: 'string',
      },
    },
    vegetables: {
      description: 'the list of vegetables that are mentioned in the provided article',
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
} as const;

const response = inferenceClient.outputApi({
  id: 'extract_from_article',
  connectorId: 'some-gen-ai-connector',
  schema: mySchema,
  system:
    'You are a helpful assistant and your current task is to extract informations from the provided document',
  input: `
    Please find all the animals and vegetables that are mentioned in the following document:
    
    ## Document
    
    ${theDoc}
  `,
});

// output is properly typed from the provided schema
const { animals, vegetables } = response.output;
```

### Errors

All known errors are instances, and not extensions, of the `InferenceTaskError` base class, which has a `code`, a `message`, and `meta` information about the error.
This allows us to serialize and deserialize errors over the wire without a complicated factory pattern.

Type guards for each type of error are exposed from the `@kbn/inference-common` package, such as:

- `isInferenceError`
- `isInferenceInternalError`
- `isInferenceRequestError`
- ...`isXXXError`
