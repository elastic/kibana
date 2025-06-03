# Prompt API

The `Inference` plugin exposes a Prompt API where consumers can pass in structured `Prompt` objects that contain model-specific versions, in order to facilitate model-specific prompting, tool definitions and options. The Prompt API only cares about input - other than that it is a pass-through to the ChatComplete API.

## Defining a prompt

A prompt is defined using a `Prompt` object. This object includes a name, description, an input schema (using Zod for validation), and one or more `PromptVersion`s. Each version can specify different system messages, user/assistant message templates, tools, and model matching criteria.

You can use the `createPrompt` helper function (from `@kbn/inference-cli` or a similar package) to build a `Prompt` object.

**Example:**

```typescript
import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-cli/src/client/create_prompt'; // Adjust path as necessary
import { ToolOptions } from '../chat_complete'; // Adjust path as necessary

const myPrompt = createPrompt({
  name: 'my-example-prompt',
  input: z.object({
    userName: z.string(),
    item: z.string(),
  }),
  description: 'An example prompt to greet a user and ask about an item.',
})
  .version({
    // This version is a fallback if no specific model matches
    system: `You are a helpful assistant.`,
    template: {
      mustache: {
        template: `Hello {{userName}}, what about the {{item}}?`,
      },
    },
  })
  .version({
    models: [{ family: 'Elastic', provider: 'Elastic', id: 'rainbow-sprinkles' }],
    system: `You are an advanced AI assistant, specifically Elastic LLM.`,
    template: {
      mustache: {
        template: `Greetings {{userName}}. Your query about "{{item}}" will be processed Elastic LLM.`,
      },
    },
    tools: {
      itemLookup: {
        description: 'A tool to look up item details.',
        schema: {
          type: 'object',
          properties: {
            itemName: { type: 'string' },
          },
          required: ['itemName'],
        },
      },
    } as const,
  })
  .get();
```

### Model versions

Each `Prompt` can have multiple `PromptVersion`s. These versions allow you to tailor the prompt's behavior (like the system message, template, or tools) for different large language models (LLMs).

When a prompt is executed, the system tries to find the best `PromptVersion` to use with the target LLM. This is done by evaluating the `models` array within each `PromptVersion`:

- Each `PromptVersion` can define an optional `models` array. Each entry in this array is a `ModelMatch` object, which can specify criteria like model `id`, `provider`, or `deployment`.
- A `PromptVersion` is a candidate if one of its `ModelMatch` entries matches the target LLM, or no `models` are defined.
- Matching versions are then sorted by specificity (id matches, other model properties match, no models are defined)
- If no matching versions are found, behaviour is undefined (it might select another version, or it might throw an error)

## Running a prompt

Once a `Prompt` object is defined (e.g., `myPrompt` from the example above), you can execute it using an inference client's `prompt()` method. You need to provide the `Prompt` object and the input values that conform to the prompt's `input` schema.

The client will:

1.  Select the best `PromptVersion` based on the target model and the matching/scoring logic.
2.  Interpolate inputs into the template (if applicable, e.g., for Mustache templates).
3.  Send the request to the LLM.
4.  Return the LLM's response.

**Example:**

```typescript
async function executeMyPrompt(userName: string, item: string) {
  try {
    const result = await inferenceClient.prompt({
      prompt: myPrompt,
      input: {
        userName,
        item,
      },
    });
    log.info('LLM Response:', result);
    return result;
  } catch (error) {
    log.error('Error running prompt:', error);
    throw error;
  }
}
```
