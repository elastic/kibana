/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptTemplate } from '../utils/output_executor';

/**
 * Prompt used to ask the LLM to improve a function or command page
 */
export const rewriteFunctionPagePrompt: PromptTemplate<{
  content: string;
  documentation: string;
  command: boolean;
}> = ({ content, documentation, command: isCommand }) => {
  const entityName = isCommand ? 'command' : 'function';
  return {
    system: `
      You are a helpful assistant specialized in rewriting technical documentation articles
      about ES|QL, the new Query language from Elasticsearch written in Markdown format.

      An ES|QL query is composed of a source command followed by an optional
      series of processing commands, separated by a pipe character: |. For
      example:
          <source-command>
          | <processing-command1>
          | <processing-command2>

      An example of what an ES|QL query looks like:

      \`\`\`esql
      FROM employees
      | WHERE still_hired == true
      | EVAL hired = DATE_FORMAT("YYYY", hire_date)
      | STATS avg_salary = AVG(salary) BY languages
      | EVAL avg_salary = ROUND(avg_salary)
      | EVAL lang_code = TO_STRING(languages)
      | ENRICH languages_policy ON lang_code WITH lang = language_name
      | WHERE lang IS NOT NULL
      | KEEP avg_salary, lang
      | SORT avg_salary ASC
      | LIMIT 3
      \`\`\`

      You will be given a technical documentation article about a specific ES|QL ${entityName},
      please rewrite it using the following template:

      \`\`\`markdown
      # {title of the ${entityName}}

      {short description of what the ${entityName} does}

      ## Syntax

      {syntax used for the ${entityName}. Just re-use the content from the original article}

      ### Parameters

      {foreach parameters}
      #### {parameter name}

      {if the parameter is optional, mention it. otherwise don't mention it's not optional}

      {short explanation of what the parameter does}

      {end foreach argument}

      ## Examples

      {list of examples from the source doc}
      \`\`\`

      Additional instructions:

      - Follow the template, and DO NOT add any section, unless explicitly asked for in the instructions.

      - DO NOT modify the main title of the page, it must only be the command name, e.g. "## AVG"

      - Do NOT mention "ES|QL" in the description
         - GOOD: "The AVG ${entityName} calculates [...]"
         - BAD: "The AVG ${entityName} in ES|QL calculates [...]"

      - Move the description section at the beginning of the file (but remove the title).
        - This means there is no longer a "Description" section after the "Parameters" one

      - For the "Syntax" section, if you need to escape code blocks, use single ticks and not triple ticks
        - GOOD: \`AVG(number)\`
        - BAD: \`\`\`AVG(number)\`\`\`

      - For the "Parameters" section
        - if there is a description of the parameter in the source document, re-use it. Else, use your own words.

      - For the "Examples" section:
          - Re-use as much as possible examples from the source document
          - DO NOT modify the syntax of the examples. The syntax is correct, don't try to fix it.
          - For each example, add a short, entity-dense sentence explaining what the example does.
             - GOOD: "Calculate the average salary change"
             - BAD: "Calculate the average salary change. This example uses the \`MV_AVG\` function to first average the multiple values per employee, and then uses the result with the \`AVG\` function:"

      - If any limitations impacting this ${entityName} are mentioned in this document or other ones, such
        as the "esql-limitations.html" file, please add a "Limitations" section at the bottom of the file
        and mention them. Otherwise, don't say or mention that there are no limitations.

      - When you generate a complete ES|QL query for the examples, always wrap it in code blocks
        with the language being \`esql\`.

      An example of rewrite would be:

      Source:

      /////
      ${source}
      /////

      Output:

      /////
      ${output}
      /////


      Please answer exclusively with the content of the output document, without any additional messages,
      information, though or reasoning. DO NOT wrap the output with \`\`\`markdown.

      The full documentation, in JSON format:
      \`\`\`json
      ${documentation}
      \`\`\`

      Please use it to search for limitations or additional information or examples when rewriting the article.
      `,
    input: `
      This is the technical document page you need to rewrite:

      \`\`\`markdown
      ${content}
      \`\`\`
      `,
  };
};

const source = `
## DISSECT

DISSECT enables you to extract structured data out of a string.

### Syntax

\`\`\`esql
DISSECT input \"pattern\" [APPEND_SEPARATOR=\"<separator>\"]
\`\`\`

### Parameters

#### input

The column that contains the string you want to structure. If the column has multiple values, DISSECT will process each value.

#### pattern

A dissect pattern. If a field name conflicts with an existing column, the existing column is dropped. If a field name is used more than once, only the rightmost duplicate creates a column.

#### <separator>

A string used as the separator between appended values, when using the append modifier.

### Description

DISSECT enables you to extract structured data out of a string. DISSECT matches the string against a delimiter-based pattern, and extracts the specified keys as columns.

Refer to Process data with DISSECT for the syntax of dissect patterns.

### Examples

The following example parses a string that contains a timestamp, some text, and an IP address:

\`\`\`esql
ROW a = \"2023-01-23T12:15:00.000Z - some text - 127.0.0.1\"
| DISSECT a \"%{date} - %{msg} - %{ip}\"
| KEEP date, msg, ip
\`\`\`

By default, DISSECT outputs keyword string columns. To convert to another type, use Type conversion functions:

\`\`\`esql
ROW a = \"2023-01-23T12:15:00.000Z - some text - 127.0.0.1\"
| DISSECT a \"%{date} - %{msg} - %{ip}\"
| KEEP date, msg, ip
| EVAL date = TO_DATETIME(date)
\`\`\`

`;

const output = `
 # DISSECT

The DISSECT command is used to extract structured data from a string.
It matches the string against a delimiter-based pattern and extracts the specified keys as columns.

## Syntax

\`DISSECT input "pattern" [APPEND_SEPARATOR="<separator>"]\`

### Parameters

#### input

The column containing the string you want to structure. If the column has multiple values, DISSECT will process each value.

#### pattern

A dissect pattern. If a field name conflicts with an existing column, the existing column is dropped. If a field name is used more than once, only the rightmost duplicate creates a column.

#### <separator>

A string used as the separator between appended values, when using the append modifier.

## Examples

The following example parses a string that contains a timestamp, some text, and an IP address:

\`\`\`esql
ROW a = "2023-01-23T12:15:00.000Z - some text - 127.0.0.1"
| DISSECT a "%{date} - %{msg} - %{ip}"
| KEEP date, msg, ip
\`\`\`

By default, DISSECT outputs keyword string columns. To convert to another type, use Type conversion functions:

\`\`\`esql
ROW a = "2023-01-23T12:15:00.000Z - some text - 127.0.0.1"
| DISSECT a "%{date} - %{msg} - %{ip}"
| KEEP date, msg, ip
| EVAL date = TO_DATETIME(date)
\`\`\`
`;
