/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ChatPromptTemplate } from '@langchain/core/prompts';
export const ECS_MAIN_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in Elastic Common Schema (ECS), focusing only on helping users with translating their provided combined samples to Elastic Common Schema (ECS).

Here is some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<ecs>
{ecs}
</ecs>
</context>`,
  ],
  [
    'human',
    `Looking at the combined sample from {package_name} {data_stream_name} provided above. The combined sample is a JSON object that includes all unique fields from the log samples sent by {package_name} {data_stream_name}.

<combined_samples>
{combined_samples}
</combined_samples>

Go through each value step by step and modify it with the following process:
1. Check if the name of each key and its current value matches the description and usecase of any of the above ECS fields.
2. If one or more relevant ECS field is found, pick the one you are most confident about.
3. If no relevant ECS field is found, the value should just be replaced with "null" rather than a new object.
4. Only if a relevant ECS field is found replace the value with a new object that has the keys "target", "confidence", "date_format" and "type".
5. The object key "target" should be set to be the full path of the ECS field name you think it matches. Set the object key "type" to be either "string", "boolean", "number" or "date" depending on what was detected as the example value.
6. If the type "date" is used, then set date_format to be an array of one or more of the equivilant JAVA date formats that fits the example value, including those with nanosecond precision. If the type is not date then date_format should be set to an empty array [].
7. Use a custom date pattern if the built-in date format patterns do not match the example value , including those with nanosecond precision.
8. For each key that you set a target ECS field, also score the confidence you have in that the target field is correct, use a float between 0.0 and 1.0 and set the value in the nested "confidence" key.
9. When you want to use an ECS field as a value for a target, but another field already has the same ECS field as its target, try to find another fitting ECS field. If none is found then the one you are least confident about should have the object replaced with null.
10. If you are not confident for a specific field, you should always set the value to null.
11. These {package_name} log samples are based on source and destination type data, prioritize these compared to other related ECS fields like host.* and observer.*.
12. Whenever possible, map the @timestamp field to the relevant field that contains the event creation date.

You ALWAYS follow these guidelines when writing your response:
<guidelines>
- Never use \`event.category\` or \`event.type\` as target ECS fields.
- The key named "target" should never have a null value or a "null" string, if no matching target ECS field is found the original source key's value should be set to null..
- Never use the same ECS target multiple times. If no other field is found that you are confident in, it should always be null.
- All keys should be under the {package_name} {data_stream_name} parent fields, same as the original combined sample above.
- All values for the key named "target" should be ECS field names only from the above ECS fields provided as context.
- All original keys from the combined sample object needs to be in your response.
- Only when a target value is set should type, date_format and confidence be filled out. If no target value then the value should simply be null.
- Do not respond with anything except the ecs maping JSON object enclosed with 3 backticks (\`), see example response below.
</guidelines>

Example response format:
<example_response>
A: Please find the JSON object below:
\`\`\`json
{ex_answer}
\`\`\`
</example_response>"`,
  ],
  ['ai', 'Please find the JSON object below:'],
]);

export const ECS_INVALID_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in Elastic Common Schema (ECS), you help review and try to resolve incorrect field mappings. 

Here is some context for you to reference your task, read it carefully as you will get questions about it later:
<context>
<ecs>
{ecs}
</ecs>
<combined_samples>
{combined_samples}
</combined_samples>
<current_mapping>
{current_mapping}
</current_mapping>
</context>`,
  ],
  [
    'human',
    `The following fields are mapped incorrectly in the current mapping, please help me resolve this:
<invalid_ecs_fields>
{invalid_ecs_fields}
</invalid_ecs_fields>

To resolve the invalid ecs fields, go through each key and value defined in the invalid fields, and modify the current mapping step by step, and ensure they follow these guidelines:
<guidelines>
- Update the provided current mapping object, the value should be the corresponding Elastic Common Schema field name. If no good or valid match is found the value should always be null.
- Do not respond with anything except the updated current mapping JSON object enclosed with 3 backticks (\`). See example response below.
</guidelines>

Example response format:
<example>
A: Please find the JSON object below:
\`\`\`json
{ex_answer}
\`\`\`
</example>`,
  ],
  ['ai', 'Please find the JSON object below:'],
]);

export const ECS_MISSING_KEYS_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in Elastic Common Schema (ECS), you help review and try to resolve missing fields in the current mapping.

Here is some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<ecs>
{ecs}
</ecs>
<combined_samples>
{combined_samples}
</combined_samples>
<current_mapping>
{current_mapping}
</current_mapping>
</context>`,
  ],
  [
    'human',
    `The following keys are missing from the current mapping:
<missing_keys>
{missing_keys}
</missing_keys>
  
Help resolve the issue by adding the missing keys, look up example values from the combined samples, and go through each missing key step by step, resolve it by following these guidelines:
<guidelines>
- Update the provided current mapping object with all the missing keys, the value should be the corresponding Elastic Common Schema field name. If no good match is found the value should always be null.
- Do not respond with anything except the updated current mapping JSON object enclosed with 3 backticks (\`). See example response below.
</guidelines>

Example response format:
<example>
A: Please find the JSON object below:
\`\`\`json
{ex_answer}
\`\`\`
</example>`,
  ],
  ['ai', 'Please find the JSON object below:'],
]);

export const ECS_DUPLICATES_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in Elastic Common Schema (ECS), you help review and try to resolve incorrect duplicate fields in the current mapping.

Here is some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<ecs>
{ecs}
</ecs>
<current_mapping>
{current_mapping}
</current_mapping>
</context>`,
  ],
  [
    'human',
    `The following duplicate fields are mapped to the same ECS fields in the current mapping, please help me resolve this:
<duplicate_fields>
{duplicate_fields}
</duplicate_fields>

Go through each ECS field in the above list of duplicate fields step by step and and modify the current mapping following this process:
1. For each duplicate ECS field there is 2 or more source fields that has target set to the same ECS field, identify which of these it is.
2. For each of the source fields that has the same target set, choose only one of them to have the target set to the ECS field, for the rest you should either find another matching ECS field or set the source to be null.
3. Make sure that all of the ECS fields mentioned in the duplicate fields above have been resolved and return the updated current mapping object.

To resolve the duplicate mappings, go through each key and value defined in the duplicate fields, and modify the current mapping step by step, and ensure they follow these guidelines:
<guidelines>
- Only focus on ECS fields reported as duplicate fields, do not modify any other fields.
- For all fields that are marked duplicate, when the best target is choosen, remember to set the value of the source field to null.
- The value "target" should not have a null value, but rather the source object itself should be set to null, use the existing current mapping for reference.
- Do not respond with anything except the updated current mapping JSON object enclosed with 3 backticks (\`). See example response below.
</guidelines>

Example response format:
<example>
A: Please find the JSON object below:
\`\`\`json
{ex_answer}
\`\`\`
</example>`,
  ],
  ['ai', 'Please find the JSON object below:'],
]);
