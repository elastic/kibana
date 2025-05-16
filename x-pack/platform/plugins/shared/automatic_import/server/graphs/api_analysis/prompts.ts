/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ChatPromptTemplate } from '@langchain/core/prompts';

export const SUGGESTED_PATHS_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in REST APIs.
Here is some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<path_options>
{path_options}
</path_options>
</context>`,
  ],
  [
    'human',
    `Review each of the path_options specified as each option represents a REST endpoint path and a short description of that path. Please determine from the provided options
a list of recommendations for which paths to use to retrieve data relevant to {data_stream_title}. Return at least 1, but up to 4 options in order of best fit. Be sure
to only respond with exact path from the options provided.

You ALWAYS follow these guidelines when writing your response:
 <guidelines>
 - Prioritize bulk api routes over more specialized routes.
 - Try and return as many options from the provided list as possible, while maintaining preference order.
 - Your response must only include exact paths specified in the path_options.
 </guidelines>

Please respond with a string array of the suggested paths.

 <example_response>
 A: Please find the suggested paths below:
 \`\`\`
{ex_answer}
 \`\`\`
 </example_response>`,
  ],
  ['ai', `Please find the suggested paths below:`],
]);
