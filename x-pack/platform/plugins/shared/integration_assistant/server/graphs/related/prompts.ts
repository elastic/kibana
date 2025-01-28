/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ChatPromptTemplate } from '@langchain/core/prompts';

export const RELATED_MAIN_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant on Elasticsearch Ingest Pipelines, focusing on providing append processors that enriches the current pipeline results.
Here are some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<ecs>
{ecs}
</ecs>
</context>`,
  ],
  [
    'human',
    `Please help me by providing all relevant append processors for any detected related.ip, related.hash, related.user and related.host fields that would fit the below pipeline results.

<pipeline_results>
{pipeline_results}
</pipeline_results>

For each pipeline result you find matching values that would fit any of the related fields perform the follow steps:
1. Identify which related field the value would fit in.
2. Create a new processor object with the field value set to the correct related.field, and the value_field set to the full path of the field that contains the value which we want to append, if that path can be encoded as a string of dict key accesses.
3. Always check if the related.ip, related.hash, related.user and related.host fields are common in the ecs context above.
4. The value_field argument in your response consist of only one value.

You ALWAYS follow these guidelines when writing your response:
<guidelines>
- The \`message\` field may not be part of related fields.
- You can use as many processor objects as needed to map all relevant pipeline result fields to any of the ECS related fields.
- You can access nested dictionaries with the field.another_field syntax, but it's not possible to access elements of an array; skip them instead.
- If no relevant fields or values are found that could be mapped confidently to any of the related fields, then respond with an empty array [] as valid JSON enclosed with 3 backticks (\`).
- Do not respond with anything except the array of processors as a valid JSON objects enclosed with 3 backticks (\`), see example response below.
</guidelines>

Example response format:
<example>
A: Please find the Related processors below:
\`\`\`json
{ex_answer}
\`\`\`
</example>`,
  ],
  ['ai', 'Please find the Related processors below:'],
]);

export const RELATED_ERROR_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant on Elasticsearch Ingest Pipelines, focusing on resolving errors and issues with append processors used for related field categorization.
Here is some context that you can reference for your task, read it carefully as you will get questions about it later:
<context>
<current_processors>
{current_processors}
</current_processors>
<common_errors>
{common_errors}
</common_errors>
</context>`,
  ],
  [
    'human',
    `Please go through each error below, carefully review the provided current processors, and resolve the most likely cause to the supplied error by returning an updated version of the current_processors.

<errors>
{errors}
</errors>
  
Follow these steps to help resolve the current ingest pipeline issues:
1. Check first if any of the errors are similar to the common errors provided above, if one is found follow the recommended action.
2. When multiple errors are involved, try to resolve them all one by one.
3. If you are unable to resolve the error, then the processor should be removed from the response.
4. Apply the relevant changes to the current processors and return the updated version.

You ALWAYS follow these guidelines when writing your response:
<guidelines>
- The \`message\` field may not be part of related fields.
- Never use "split" in template values, only use the field name inside the triple brackets. If the error mentions "Improperly closed variable in query-template" then check each "value" field for any special characters and remove them.
- You can access nested dictionaries with the field.another_field syntax, but it's not possible to access elements of an array. Never use brackets in the field name, never try to access array elements.
- If solving an error means removing the last processor in the list, then return an empty array [] as valid JSON enclosed with 3 backticks (\`).
- Do not respond with anything except the complete updated array of processors as a valid JSON object enclosed with 3 backticks (\`), see example response below.
</guidelines>

Example response format:
<example>
A: Please find the updated ECS related append processors below:
\`\`\`json
{ex_answer}
\`\`\`
</example>`,
  ],
  ['ai', 'Please find the updated ECS related append processors below:'],
]);

export const RELATED_REVIEW_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant on Elasticsearch Ingest Pipelines, focusing on adding improvements to the provided array of processors and reviewing the current results.
  
Here is some context that you can reference for your task, read it carefully as you will get questions about it later:
<context>
<current_processors>
{current_processors}
</current_processors>
<previous_error>
{previous_error}
</previous_error>
</context>`,
  ],
  [
    'human',
    `Testing my current pipeline returned me with the below pipeline results:
<pipeline_results>
{pipeline_results}
</pipeline_results>

Please review the pipeline results and the array of current processors above, and identify any field with a value that would fit with either related.ip, related.hash, related.user or related.host fields.

For each pipeline result you find matching values that would fit any of the related fields perform the follow steps:
1. Identify which related field the value would fit in.
2. Create a new processor object with the field value set to the correct related.field, and the value_field set to the full path of the field that contains the value which we want to append. You can access fields inside nested dictionaries with the field.another_field syntax, but it's not possible to access elements of an array, so skip a field if it's path contains an array.
3. If previous errors above is not empty, do not add any processors that would cause any of the same errors again, if you are unsure, then remove the processor from the list.
4. If no updates are needed, then respond with the initially provided current processors.

You ALWAYS follow these guidelines when writing your response:
<guidelines>
- You can use as many processor objects as needed to map all relevant pipeline result fields to any of the ECS related fields.
- If no updates are needed you respond with the initially provided current processors, if no processors are present you respond with an empty array [] as valid JSON enclosied with 3 backticks (\`).
- Do not respond with anything except updated array of processors as a valid JSON object enclosed with 3 backticks (\`), see example response below.
</guidelines>

Example response format:
<example>
A: Please find the updated ECS related append processors below:
\`\`\`
{ex_answer}
\`\`\`
</example>`,
  ],
  ['ai', 'Please find the updated ECS related append processors below:'],
]);
