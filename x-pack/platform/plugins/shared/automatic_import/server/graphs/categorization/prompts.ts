/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ChatPromptTemplate } from '@langchain/core/prompts';

export const CATEGORIZATION_MAIN_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant on Elasticsearch Ingest Pipelines, focusing on providing append processors that can be used to enrich samples with all relevant event.type and event.category values.
Here are some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<ecs>
Event Category (event.category):
Purpose: It is the second level in the ECS category hierarchy, representing the primary category or "big bucket" for event classification.
Type: It's a keyword type and can have multiple values (list).
Relationship: Works alongside event.type, which acts as a subcategory.
Allowed categories and their descriptions:
{ecs_categories}

Event Type (event.type):
Purpose: It is the third level in the ECS category hierarchy, represents a categorization "sub-bucket".
Type: It's a keyword type and can have multiple values (list).
Relationship: Works alongside event.category, which acts as a subcategory.
Allowed types and their descriptions:
{ecs_types}
</ecs>
<example_processors>
{example_processors}
</example_processors>
</context>`,
  ],
  [
    'human',
    `Please help by providing all relevant processors objects for any detected event.category and event.type combinations that would fit the below pipeline results.

<pipeline_results>
{pipeline_results}
</pipeline_results>

Go through each of the pipeline results above step by step and do the following to add all relevant event.type and event.category combinations.
1. Try to understand what is unique about each pipeline result, and what sort of event.categorization and event.type combinations that fit best, and if there is any unique values for each result.
2. For for each combination of event.category and event.type that you find, add a new processor object to your response.
3. If only certain results are relevant to the event.category and event.type combination, add an if condition similar to the above example processors, that describes what value or field needs to be available for this categorization to take place.
4. Always check if the combination of event.category and event.type is common in the ecs context above.
5. Always make sure the value for event.category and event.type is strictly from the allowed categories and allowed types in the ecs context above.
6. The value argument for the append processor is an array of one or more of the allowed values for either event.type or event.category.
7. If you can't find any relevant event.category and event.type combinations for a specific pipeline result or you are unsure then you can skip that result and move on to the next.

You ALWAYS follow these guidelines when writing your response:
<guidelines>
- You can add as many processor objects as you need to cover all the unique combinations that was detected.
- If conditions should always use a ? character when accessing nested fields, in case the field might not always be available, see example processors above.
- You can access nested dictionaries with the ctx.field?.another_field syntax, but it's not possible to access elements of an array. Never use brackets in an if statement.
- When an if condition is not needed the argument it should not be included in that specific object of your response.
- When using a range based if condition like > 0, you first need to check that the field is not null, for example: ctx.somefield?.production != null && ctx.somefield?.production > 0
- If no good match is found for any of the pipeline results, then respond with an empty array [] as valid JSON enclosed with 3 backticks (\`).
- Do not respond with anything except the array of processors as valid JSON objects enclosed with 3 backticks (\`), see example response below.
</guidelines>

Example response format:
<example>
A: Please find the Categorization processors below:
\`\`\`json
{ex_answer}
\`\`\`
</example>`,
  ],
  ['ai', 'Please find the Categorization processors below:'],
]);

export const CATEGORIZATION_REVIEW_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant on Elasticsearch Ingest Pipelines, focusing on adding improvements to the provided array of processors and reviewing the current results.

Here is some context that you can reference for your task, read it carefully as you will get questions about it later:
<context>
<current_processors>
{current_processors}
</current_processors>
<compatibility_matrix>
{compatibility_matrix}
</compatibility_matrix>
<previous_error>
{previous_error}
</previous_error>
<previous_invalid_categorization>
{previous_invalid_categorization}
</previous_invalid_categorization>
</context>`,
  ],
  [
    'human',
    `Testing my current pipeline returned me with the results:
<pipeline_results>
{pipeline_results}
</pipeline_results>

Please review the pipeline results and the array of current processors, ensuring to identify all the possible event.type and event.category combinatinations that would match each pipeline result document. If any event.type or event.category is missing from any of the pipeline results, add them by updating the array of current processors and return the whole updated array of processors.

For each pipeline result you review step by step, remember the below steps:
1. Check if each of the pipeline results have at least one event.category and event.type added to them. If not then try to correlate the results with the current processors and see if either a new append processor should be added to the list with a matching if condition, or if any of the if conditions should be modified as they are not matching that is in the results.
2. If the results have at least one event.category and event.type value, see if more of them could match, if so it could be added to the relevant append processor which added the initial values.
3. When adding more values to event.type and event.category please keep in mind the compatibility_matrix in the context to make sure only compatible event.type , event.category pairs that are compatible are created.
4. If previous errors or invalid categorization above is not empty, do not add any processors that would cause any of the same errors again. If you are unsure about a specific object then do not add it to the response.

You ALWAYS follow these guidelines when writing your response:
<guidelines>
- You can use as many processor objects as you need to add all relevant ECS categories and types combinations.
- If conditions should always use a ? character when accessing nested fields, in case the field might not always be available, see example processors above.
- You can access nested dictionaries with the ctx.field?.another_field syntax, but it's not possible to access elements of an array. Never use brackets in an if statement.
- When an if condition is not needed the argument should not be used for the processor object.
- If updates are needed you respond with the initially provided array of processors.
- If an update removes the last remaining processor object you respond with an empty array [] as valid JSON enclosed with 3 backticks (\`).
- Do not respond with anything except updated array of processors as a valid JSON object enclosed with 3 backticks (\`), see example response below.
</guidelines>

Example response format:
<example>
A: Please find the updated ECS categorization append processors below:
\`\`\`
{ex_answer}
\`\`\`
</example>`,
  ],
  ['ai', 'Please find the updated ECS categorization append processors below:'],
]);

export const CATEGORIZATION_VALIDATION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant on Elasticsearch Ingest Pipelines, focusing on resolving errors and issues with append processors used for categorization.

Here is some context that you can reference for your task, read it carefully as you will get questions about it later:
<context>
<current_processors>
{current_processors}
</current_processors>
<compatible_types>
{compatible_types}
</compatible_types>
<errors>
{invalid_categorization}
</errors>
</context>`,
  ],
  [
    'human',
    `Please go through each error above, carefully review the provided current processors, and resolve the most likely cause to the supplied error by returning an updated version of the current_processors.

Follow these steps to help resolve the current ingest pipeline issues:
1. Try to fix all related errors before responding.
2. Apply all fixes to the provided array of current append processors.
3. If you do not know how to fix an error, then continue to the next and return the complete updated array of current append processors.

You ALWAYS follow these guidelines when writing your response:
<guidelines>
- If the error complains about having event.type or event.category not in the allowed values , fix the corresponding append processors to use the allowed values mentioned in the error.
- If the error is about event.type not compatible with any event.category, please refer to the 'compatible_types' in the context to fix the corresponding append processors to use valid combination of event.type and event.category
- If resolving the validation removes the last remaining processor object, respond with an empty array [] as valid JSON enclosed with 3 backticks (\`).
- Reminder: you can access nested dictionaries with the ctx.field?.another_field syntax, but it's not possible to access elements of an array. Never use brackets in an if statement.
- Do not respond with anything except the complete updated array of processors as a valid JSON object enclosed with 3 backticks (\`), see example response below.
</guidelines>

Example response format:
<example>
A: Please find the updated ECS categorization append processors below:
\`\`\`json
{ex_answer}
\`\`\`
</example>`,
  ],
  ['ai', 'Please find the updated ECS categorization append processors below:'],
]);

export const CATEGORIZATION_ERROR_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant on Elasticsearch Ingest Pipelines, focusing on resolving errors and issues with append processors used for categorization.
Here is some context that you can reference for your task, read it carefully as you will get questions about it later:
<context>
<current_processors>
{current_processors}
</current_processors>
</context>`,
  ],
  [
    'human',
    `Please go through each of the below errors, carefully review the provided current processors, and resolve the most likely cause to the supplied error by returning an updated version of the current_processors.

<errors>
{errors}
</errors>

Follow these steps to help resolve the current ingest pipeline issues:
1. Try to fix all related errors before responding.
2. Apply all fixes to the provided array of current append processors.
3. If you do not know how to fix an error or are unsure, remove the object related to the error, then continue to the next and return the complete updated array of current append processors.
4. It is okay to remove the last processor object if it is causing the error or you are unsure about how to resolve it.

You ALWAYS follow these guidelines when writing your response:
<guidelines>
- When checking for the existance of multiple values in a single variable, use this format: "if": "['value1', 'value2'].contains(ctx.{package_name}?.{data_stream_name}?.field)"
- If conditions should never be in a format like "if": "true". If it exist in the current array of append processors, remove only the redundant if condition.
- If the error complains that it is a null point exception, always ensure the if conditions uses a ? when accessing nested fields. For example ctx.field1?.nestedfield1?.nestedfield2.
- If the error complains about having values not in the list of allowed values , fix the corresponding append processors to use the allowed values as mentioned in the error.
- If resolving the error removes the last remaining processor object, respond with an empty array [] as valid JSON enclosed with 3 backticks (\`).
- Do not respond with anything except the complete updated array of processors as a valid JSON object enclosed with 3 backticks (\`), see example response below.
</guidelines>

Example response format:
<example>
A: Please find the updated ECS categorization append processors below:
\`\`\`json
{ex_answer}
\`\`\`
</example>`,
  ],
  ['ai', 'Please find the updated ECS categorization append processors below:'],
]);
