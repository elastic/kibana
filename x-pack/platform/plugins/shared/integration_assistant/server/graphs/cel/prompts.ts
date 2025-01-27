/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ChatPromptTemplate } from '@langchain/core/prompts';

export const CEL_QUERY_SUMMARY_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in REST APIs and OpenAPI specifications.
Here is some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<path_details>
{path_details}
</path_details>
</context>`,
  ],
  [
    'human',
    `For the {path} endpoint and provided OpenAPI specification, please describe which query parameters you would use so that all {data_stream_name} events are covered in a chronological manner.

Please respond with a concise text answer, and a sample URL path.`,
  ],
  ['ai', `Please find the query summary text below:`],
]);

export const CEL_BASE_PROGRAM_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in building Elastic filebeat input configurations utilizing the Common Expression Language (CEL) input type.
Here is some context for you to reference your task, review it carefully as you will get questions about it later:
<context>
<open_api_path_details>
{open_api_path_details}
</open_api_path_details>
<open_api_schemas>
{open_api_schemas}
</open_api_schemas>
<example_cel_programs>
{example_cel_programs}
</example_cel_programs>
</context>`,
  ],
  [
    'human',
    `Please build only the program section of the CEL filebeat input configuration for the the datastream {data_stream_name} such that the program is able to iterate through and ingest pages of events into Elasticsearch.
Utilize the following paging summary details and sample URL for implementing paging when building your output.

<context>
<api_query_summary>
{api_query_summary}
</api_query_summary>
</context>

Each of the following criteria must be addressed in final configuration output:
- The entire program must be wrapped with \`state.with()\`.
- The REST verb must be specified.
- The request URL must include the 'state.url'.
- Any reference to 'state.url' must append \`.trim_right("/")\`.
- The request URL must include the API path.
- The request URL must include all query parameters from the paging summary using a 'format_query' function. Remember to utilize the state variables inside brackets when building the function and be sure to cast any numeric variables to string using 'string(variable)'.
- All request URL parameters must utilize state variables.
- The request URL must include a '?' at the end of API path string.
- Always use the casing specified by the API spec when building the API path and query parameters.
- There must not be configuration for authentication or authorization.
- There must be configuration of any required headers.
- Any usage of state variables must be optional like \`"token": state.?cursor.token.optMap(v, [v]),\`.
- There must be configuration for parsing the events returned from the API mapped to the 'message' field and encoded in JSON.
- There must be configuration in the API response handling for 'want_more' based on the paging token.
- There must be configuration for error handling. This includes setting the 'want_more' flag to false.
- Be sure to only return a single object as the error, never an array of objects.
- All state variables must use snake casing.
- The page tokens must be updated the corresponding state variable(s).

You ALWAYS follow these guidelines when writing your response:
<guidelines>
- You must never include any code for writing data to the API.
- You must respond only with the code block containing the program formatted like human-readable C code. See example response below.
- You must use 2 spaces for tab size.
- The final program must not be enclosed in parentheses.
- Do not enclose the final output in backticks, only return the codeblock and nothing else.
</guidelines>

Example response:
A: Please find the CEL program below:
{ex_answer}`,
  ],
  ['ai', `Please find the CEL program below:`],
]);

export const CEL_ANALYZE_HEADERS_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in writing and analyzing CEL programs for Elastic filebeat. Here is some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<cel_program>
{cel_program}
</cel_program>
</context>`,
  ],
  [
    'human',
    `Looking at the CEL program provided in the context, please return a boolean response for whether or not the program contains any headers on the HTTP request to get events. Return true if there are headers, and false if there are none. Do not respond with anything except the boolean answer.`,
  ],
  ['ai', `Please find the boolean answer below:`],
]);

export const CEL_STATE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in building Elastic filebeat input configurations utilizing the Common Expression Language (CEL) input type.
Here is some context for you to reference for your task, read it carefully as you will get questions about it later:

<context>
<cel_program>
{cel_program}
</cel_program>
</context>`,
  ],
  [
    'human',
    `Looking at the CEL program provided in the context, please return a string array of the state variables

You ALWAYS follow these guidelines when writing your response:

 <guidelines>
 - Respond with the array only.
 </guidelines>

 <example_response>
 A: Please find the JSON list below:
 \`\`\`
{ex_answer}
 \`\`\`
 </example_response>`,
  ],
  ['ai', `Please find the JSON list below:`],
]);

export const CEL_CONFIG_DETAILS_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant on OpenAPI specifications and building Elastic integrations.
Here is some context for you to reference for your task, read it carefully as you will get questions about it later:

<context>
<open_api_path_details>
{open_api_path_details}
</open_api_path_details>
</context>`,
  ],
  [
    'human',
    `For the identified state variables {state_variables}, iterate through each variable (name) and identify a boolean representing if it should be user configurable (configurable), a helpful description (description), type (type), default value (default), and a boolean representing if it should be redacted (redact). Return all of this information in a JSON object like the sample below. 

You ALWAYS follow these guidelines when writing your response:

 <guidelines>
 - Page sizing default should always be non-zero.
 - Most things should be configurable, unless otherwise stated in these guidelines.
 - OAuth2, basic, and digest auth details are always configurable.
 - Always set a default to use the most broad settings for parameters that filter down event types in the responses.
 - Most tokens should not be configurable, unless they are API tokens.
 - A variable cannot need redaction if it is not user configurable.
 - Paging information, cursor information, usernames and client ids should never be redacted.
 - Redact anything that could possibly contain PII, API tokens or keys, or expose any sensitive information in the logs.
 - The types should be consistent with the Elastic integration configuration types. For example, 'text' for strings, 'integer' for whole numbers, and 'password' for API keys.
 - You must use the variable names in parentheses when building the return object. Each item in the response must contain the fields: name, configurable, description, type, redact and default.
 - Do not respond with anything except the JSON object enclosed with 3 backticks (\`), see example response below.
 </guidelines>
Example response format:
 <example_response>
 A: Please find the JSON object below:
 \`\`\`json
{ex_answer}
 \`\`\`
 </example_response>
`,
  ],
  ['ai', `Please find the JSON object below:`],
]);

export const CEL_AUTH_HEADERS_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in building Elastic filebeat input configurations utilizing the Common Expression Language (CEL) input type.
Here is some context for you to reference your task, review it carefully as you will get questions about it later:
<context>
<open_api_auth_schema>
{open_api_auth_schema}
</open_api_auth_schema>
</context>`,
  ],
  [
    'human',
    `Please update the following CEL program for the OpenAPI Header authentication information specified in the context.

<context>
<cel_program>
{cel_program}
</cel_program>
</context>
    
You ALWAYS follow these guidelines when writing your response:
<guidelines>
- Do not update any other details of the program besides authentication on the GET request headers.
- You must use the state variable name \`api_key\` for representing the authentication key value. 
- You must respond only with the code block containing the program formatted like human-readable C code. See example response below.
- You must use 2 spaces for tab size.
- The final program must not be enclosed in parentheses.
- Do not enclose the final output in backticks, only return the codeblock and nothing else.
</guidelines>`,
  ],
  ['ai', `Please find the updated program below:`],
]);

export const CEL_AUTH_OAUTH2_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in building Elastic filebeat input configurations utilizing the Common Expression Language (CEL) input type.
Here is some context for you to reference your task, review it carefully as you will get questions about it later:
<context>
<open_api_auth_schema>
{open_api_auth_schema}
</open_api_auth_schema>
<example_cel_programs>
{example_cel_programs}
</example_cel_programs>
</context>`,
  ],
  [
    'human',
    `Please update the following CEL program for the OpenAPI OAuth2 authentication information specified in the context.

<context>
<cel_program>
{cel_program}
</cel_program>
</context>

Each of the following criteria must be addressed in final configuration output:
- There must be configuration for submitting a request for the oauth token. 
- The received token must be utilized in subsequent GET requests for the events.
- There must be configuration for error handling for the oauth token request.
    
You ALWAYS follow these guidelines when writing your response:
<guidelines>
- You must use the state variable name \`oauth_id\` for representing the OAUth2 client id.
- You must use the state variable name \`oauth_secret\` for representing the OAUth2 client secret. 
- You must respond only with the code block containing the program formatted like human-readable C code. See example response below.
- You must use 2 spaces for tab size.
- The final program must not be enclosed in parentheses.
- Do not enclose the final output in backticks, only return the codeblock and nothing else.
</guidelines>`,
  ],
  ['ai', `Please find the updated program below:`],
]);

export const CEL_AUTH_BASIC_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in building Elastic filebeat input configurations utilizing the Common Expression Language (CEL) input type.
Here is some context for you to reference your task, review it carefully as you will get questions about it later:
<context>
<open_api_auth_schema>
{open_api_auth_schema}
</open_api_auth_schema>
</context>`,
  ],
  [
    'human',
    `Please update the following CEL program for the OpenAPI Basic authentication information specified in the context.

<context>
<cel_program>
{cel_program}
</cel_program>
</context>
    
You ALWAYS follow these guidelines when writing your response:
<guidelines>
- You must use the state variable name \`username\` for representing the auth username.
- You must use the state variable name \`password\` for representing the auth password. 
- Do not update any other details of the program besides authentication on the GET request headers. 
- You must respond only with the code block containing the program formatted like human-readable C code. See example response below.
- You must use 2 spaces for tab size.
- The final program must not be enclosed in parentheses.
- Do not enclose the final output in backticks, only return the codeblock and nothing else.
</guidelines>`,
  ],
  ['ai', `Please find the updated program below:`],
]);

export const CEL_AUTH_DIGEST_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in writing and analyzing CEL programs for Elastic filebeat. Here is some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<cel_program>
{cel_program}
</cel_program>
</context>`,
  ],
  [
    'human',
    `Please update the program above to ensure no HTTP headers are being set and respond with the updated program.

You ALWAYS follow these guidelines when writing your response:
<guidelines>
- You must respond only with the code block containing the program formatted like human-readable C code. See example response below.
- You must use 2 spaces for tab size.
- The final program must not be enclosed in parentheses.
- Do not enclose the final output in backticks, only return the codeblock and nothing else.
</guidelines>`,
  ],
  ['ai', `Please find the updated program below:`],
]);
