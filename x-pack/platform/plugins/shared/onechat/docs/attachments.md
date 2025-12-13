# Attachments

## OOTB Attachment Types

### ESQL Query
Owner: Agent Builder

Ability to add an ESQL query as an attachment.

**Tools**: execute\_esql, generate\_esql 

```

POST kbn://api/agent_builder/converse
{
  "input": "Can you execute this query and tell me the result?",
  "attachments": [
    { 
     "type": "esql", 
     "data": { "query": "FROM wix_knowledge_base | STATS total_documents = COUNT(*)"}
    }
   ]
}
```

### Text
Owner: Agent Builder

Ability to add text to an attachment. 

```
POST kbn://api/agent_builder/converse
{
  "input": "say hello to me",
   "attachments": [
    { 
     "type": "text", 
     "data": { 
        "content": "answer in the cat tone of voice"
     }
    }
   ]
}
```


## Registering Attachment Types

Attachments are used to provide additional context when conversing with an agent.

It is possible to register custom attachment types, to have control over how the data is exposed to the agent,
and how it is rendered in the UI.

> Also see the main [CONTRIBUTOR_GUIDE.md](../CONTRIBUTOR_GUIDE.md) for general information about the Agent Builder framework.

### Server-side registration

You can register an attachment type by using the `attachments.registerType` API of the `onechat` plugin's setup contract.

```ts
class MyPlugin {
  setup(core: CoreSetup, { onechat }: { onechat: OnechatPluginSetup }) {
    onechat.attachments.registerType(myAttachmentDefinition);
  }
}
```

There are two main categories of attachment types:
- `inline`: attachment is self-contained, with the data attached to it.
  `reference`: reference a persisted resource (for example, a dashboard, an alert, etc) by its id, and resolve it dynamically when needed.
  - (Not implemented yet)

#### Example of inline attachment type definition

```ts
const textDataSchema = z.object({
  content: z.string(),
});

const textAttachmentType: InlineAttachmentTypeDefinition = {
  // unique id of the attachment type
  id: AttachmentType.text,
  // type: inline or reference
  type: 'inline',
  // validate and parse the input when received from the client
  validate: (input) => {
    const parseResult = textDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    } else {
      return { valid: false, error: parseResult.error.message };
    }
  },
  // format the data to be exposed to the LLM
  format: (input) => {
    return { type: 'text', value: input.content };
  },
}
```

Refer to [`AttachmentTypeDefinition`](https://github.com/elastic/kibana/blob/main/x-pack/platform/packages/shared/onechat/onechat-server/attachments/type_definition.ts)
for the full list of available configuration options.

### Browser-side registration

To render attachments in the UI, you need to register a UI definition for each attachment type on the browser side.
This is done using the `AttachmentServiceStartContract` from `@kbn/onechat-browser`.

#### AttachmentUIDefinition interface

The UI definition interface allows you to specify how an attachment should be displayed:

```ts
interface AttachmentUIDefinition<TAttachment extends UnknownAttachment = UnknownAttachment> {
  /**
   * Returns a human-readable label for the attachment.
   */
  getLabel: (attachment: TAttachment) => string;
  /**
   * Returns the icon type to display for the attachment.
   */
  getIcon?: () => IconType;
}
```

#### Registering attachment UI definitions

Use the `addAttachmentType` method from the `AttachmentServiceStartContract` to register UI definitions for your attachment types.

##### Example: Registering multiple attachment types

Here's an example of how to register UI definitions for multiple attachment types in a plugin:

```ts
import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/onechat-browser';
import {
  AttachmentType,
  type TextAttachment,
  type ScreenContextAttachment,
  type EsqlAttachment,
} from '@kbn/onechat-common/attachments';

export const registerAttachmentUiDefinitions = ({
  attachments,
}: {
  attachments: AttachmentServiceStartContract;
}) => {
  attachments.addAttachmentType<MyCustomAttachment>(MyCustomAttachmentType, {
    getLabel: () =>
      i18n.translate('xpack.myPlugin.attachments.text.label', {
        defaultMessage: 'Text',
      }),
    getIcon: () => 'document',
  });

};
```

#### Calling registration from your plugin

Typically, you would call the registration function during your plugin's `start` lifecycle:

```ts
class MyPlugin {
  start(core: CoreStart, { onechat }: { onechat: OnechatPluginStart }) {
    registerAttachmentUiDefinitions({
      attachments: onechat.attachments,
    });
  }
}
```

Refer to [`AttachmentUIDefinition`](https://github.com/elastic/kibana/blob/main/x-pack/platform/packages/shared/onechat/onechat-browser/attachments/contract.ts)
for the full interface definition.

