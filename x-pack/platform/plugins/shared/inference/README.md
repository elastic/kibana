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


## Anonymization

To avoid sending personally identifiable or other sensitive information to LLMs, the anonymization pipeline built into the Inference plugin replaces selected pieces of text with deterministic masks before the messages are sent and restores (de-anonymises) the original values in the responses.

### How it works

1.  When a request is handled, the Inference server looks for the UI-setting key
    `ai:anonymizationSettings`.
2.  The value of that setting is expected to be a JSON object that contains a list of **rules**.
3.  Each rule is executed against relative parts of the message — that is, the system prompt, message `content`, any assistant `toolCalls.function` arguments/response, and tool-call `response` fields. `role`, `toolCallId`, timestamps, etc. are untouched. When a rule matches it produces replaces the original text with a deterministic placeholder such as `EMAIL_ee4587b4ba681e38996a1b716facbf375786bff7` where `EMAIL` is the entity class and `ee4587b4ba681e38996a1b716facbf375786bff7` is the deterministic hash of the original value.
4.  The fully-masked conversation continues on to the model. Alongside the modified text the plugin keeps a mapping so that the same entity can later be restored.
5.  After the model has responded, the plugin restores the original values across the entire conversation (system, history and new assistant message).

Because the masking is deterministic (hash of the original value + its class) the same e-mail address
will always be replaced by the same token – letting the model maintain logical consistency ("`EMAIL_x`"
refers to the same email everywhere) without ever seeing the real address.

### Rule types

There are **two** kinds of rules and both share the common `{ enabled: boolean }` switch:

* **RegExp**
  ```jsonc
  {
    "type": "RegExp",           // required: literal string
    "enabled": true,
    "pattern": "([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})",  // JavaScript RegExp (string)
    "entityClass": "EMAIL"       // label that will appear in the mask
  }
  ```

* **NER (Named-Entity Recognition)**
  ```jsonc
  {
    "type": "NER",                      // required: literal string
    "enabled": true,
    "modelId": "elastic__distilbert-base-uncased-finetuned-conll03-english", // any NER model
    "allowedEntityClasses": ["PER", "ORG", "LOC"] // optional filter
  }
  ```
  The referenced inference model is executed server-side to find entities in free text.  Only classes
  listed in `allowedEntityClasses` are taken into account (omit the field to accept all).

> Currently this feature has only been validated with Elastic’s publicly hosted NER model [`elastic/distilbert-base-uncased-finetuned-conll03-english`](https://huggingface.co/elastic/distilbert-base-uncased-finetuned-conll03-english).  

Rules are evaluated **top-to-bottom**. If two rules overlap on the same entity, the first matching rule wins and later ones are skipped for that entity. 

### Configuring rules

1.  Navigate to **Management ➜ Advanced Settings** and search for
    **“Anonymization Settings”** (category *Observability*).
2.  Paste a JSON object with a `rules` array similar to the examples above.  The default template that
    ships with the plugin looks like:
    ```jsonc
    {
      "rules": [
        {
          "entityClass": "EMAIL",
          "type": "RegExp",
          "pattern": "([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})",
          "enabled": false
        },
        {
          "type": "NER",
          "modelId": "elastic__distilbert-base-uncased-finetuned-conll03-english",
          "enabled": false,
          "allowedEntityClasses": ["PER", "ORG", "LOC"]
        }
      ]
    }
    ```
3.  Toggle `enabled` to `true` (or add your own rules) and save.  A page refresh is required UI highlighting in chat.

If **no rules are enabled**, anonymization does not run.

> Note: Each request is processed with whatever rules are active at the time of the request, and those rules are applied to all messages included in that request – including any previous conversation history passed along.

### Using the API

Nothing special is required on the client side.  Any call made through
`inference.getClient({ request })` automatically picks up and applies the enabled rules.

Every response message received is already deanonymized. When masking has occurred, the payload will additionally contain:

* `deanonymized_input` – array of the initial and previous messages (conversation history) that were sent to the model
* `deanonymized_output` – the assistant reply with original text restored

Each message inside `deanonymized_input` or `deanonymized_output` carries its own `deanonymizations` array listing every replacement that was made.  This structured data can be stored and leveraged by UI components to visually highlight masked/unmasked segments in chat transcripts.

When you use `chatComplete` in **streaming** mode:

If no PII is detected, streaming proceeds normally (multiple `chatCompletionChunk` events followed by a final `chatCompletionMessage`).
If PII **is** detected, the server downgrades to a minimal stream: one chunk and one final message.

<details>
<summary>Example request/response</summary>

```http
POST /internal/inference/chat_complete

{
  "connectorId": "azure-gpt4o",
  "messages": [
    { "role": "user", "content": "my name is jorge.  respond with my name." }
  ],
  "system": "You are a helpful assistant."
}
```

```jsonc
{
  "content": "Hello, jorge! How can I assist you today?",
  "toolCalls": [],
  "tokens": {
    "completion": 34,
    "prompt": 165,
    "total": 199,
    "cached": 0
  },
  "deanonymized_input": [
    {
      "message": { "role": "user", "content": "my name is jorge.  respond with my name." },
      "deanonymizations": [
        {
          "start": 11,
          "end": 16,
          "entity": {
            "class_name": "PER",
            "value": "jorge",
            "mask": "PER_ee4587b4ba681e38996a1b716facbf375786bff7"
          }
        }
      ]
    }
  ],
  "deanonymized_output": {
    "message": {
      "content": "Hello, jorge! How can I assist you today?",
      "toolCalls": [],
      "role": "assistant"
    },
    "deanonymizations": [
      {
        "start": 7,
        "end": 12,
        "entity": {
          "class_name": "PER",
          "value": "jorge",
          "mask": "PER_ee4587b4ba681e38996a1b716facbf375786bff7"
        }
      }
    ]
  }
}
```

</details>